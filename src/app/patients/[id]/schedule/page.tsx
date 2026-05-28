import Link from "next/link";
import { notFound } from "next/navigation";
import { PatientRole } from "@prisma/client";
import { DoseEventCard } from "@/components/DoseEventCard";
import { ScheduleActions } from "@/components/ScheduleActions";
import { ScheduleGenerateButton } from "@/components/ScheduleGenerateButton";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getPatientMembership, hasPatientRole } from "@/lib/auth/patient-access";
import { DOSE_STATUS } from "@/lib/dose-status";
import { prisma } from "@/lib/prisma";
import { getTodayWindow } from "@/lib/schedule-generation";
import { refreshTodayScheduleStatusesForPatient } from "@/lib/today-schedule-status-processing";

const SCHEDULE_VIEW_ROLES = [
  PatientRole.PRIMARY_CAREGIVER,
  PatientRole.CAREGIVER,
  PatientRole.VIEWER,
];
const SCHEDULE_GENERATE_ROLES = [PatientRole.PRIMARY_CAREGIVER];
const DOSE_MANAGE_ROLES = [PatientRole.PRIMARY_CAREGIVER, PatientRole.CAREGIVER];

export const dynamic = "force-dynamic";

type PatientSchedulePageProps = {
  params: Promise<{
    id: string;
  }>;
};

const STATUS_ORDER = [
  DOSE_STATUS.PENDING,
  DOSE_STATUS.DUE,
  DOSE_STATUS.LATE,
  DOSE_STATUS.TAKEN,
  DOSE_STATUS.MISSED,
  DOSE_STATUS.SKIPPED,
];

export default async function PatientSchedulePage({ params }: PatientSchedulePageProps) {
  const { id } = await params;
  const today = getTodayWindow();
  const user = await getCurrentUser();

  if (!user) {
    notFound();
  }

  const membership = await getPatientMembership(id, user.id);

  if (!membership || !hasPatientRole(membership.role, SCHEDULE_VIEW_ROLES)) {
    notFound();
  }

  const patient = await prisma.patient.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!patient) {
    notFound();
  }

  await refreshTodayScheduleStatusesForPatient(prisma, patient.id);

  const patientWithSchedule = await prisma.patient.findFirst({
    where: {
      id: patient.id,
    },
    include: {
      doseEvents: {
        where: {
          scheduledAt: {
            gte: today.start,
            lt: today.end,
          },
        },
        orderBy: { scheduledAt: "asc" },
      },
    },
  });

  if (!patientWithSchedule) {
    notFound();
  }

  const statusGroups = STATUS_ORDER.map((status) => ({
    status,
    doseEvents: patientWithSchedule.doseEvents.filter((doseEvent) => doseEvent.status === status),
  })).filter((group) => group.doseEvents.length > 0);
  const canGenerateSchedule = hasPatientRole(membership.role, SCHEDULE_GENERATE_ROLES);
  const canManageDoseEvents = hasPatientRole(membership.role, DOSE_MANAGE_ROLES);

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <h1>Today&apos;s schedule</h1>
          <p>{patientWithSchedule.fullName}</p>
        </div>
        <ScheduleActions
          canGenerateSchedule={canGenerateSchedule}
          canProcessDoseStatuses={canManageDoseEvents}
          patientId={patientWithSchedule.id}
        />
      </header>

      {patientWithSchedule.doseEvents.length === 0 ? (
        <section className="empty-state">
          <h2>No doses generated for today</h2>
          <p>
            Add medicines manually if needed, then generate today&apos;s schedule from active
            medicines and timings.
          </p>
          <div className="empty-state-actions">
            {canGenerateSchedule ? (
              <>
                <ScheduleGenerateButton patientId={patientWithSchedule.id} />
                <Link className="primary-button" href={`/patients/${patientWithSchedule.id}/medicines/new`}>
                  Add medicine
                </Link>
              </>
            ) : null}
            <Link className="secondary-button" href={`/patients/${patientWithSchedule.id}`}>
              Back to patient
            </Link>
            <Link className="secondary-button" href={`/patients/${patientWithSchedule.id}/dashboard`}>
              Dashboard
            </Link>
          </div>
        </section>
      ) : (
        <>
          <p className="helper-note">
            Today&apos;s statuses are refreshed automatically. Stopped medicines keep earlier dose
            history.
          </p>
          <section className="schedule-list" aria-label="Today&apos;s dose schedule">
            {statusGroups.map((group) => (
              <div className="schedule-group" key={group.status}>
                <h2>{group.status}</h2>
                <div className="dose-list">
                  {group.doseEvents.map((doseEvent) => (
                    <DoseEventCard
                      canManageDoseEvents={canManageDoseEvents}
                      key={doseEvent.id}
                      doseEvent={doseEvent}
                    />
                  ))}
                </div>
              </div>
            ))}
          </section>
        </>
      )}
    </main>
  );
}
