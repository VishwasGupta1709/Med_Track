import { notFound } from "next/navigation";
import { DoseEventCard } from "@/components/DoseEventCard";
import { ScheduleActions } from "@/components/ScheduleActions";
import { ScheduleGenerateButton } from "@/components/ScheduleGenerateButton";
import { DOSE_STATUS } from "@/lib/dose-status";
import { prisma } from "@/lib/prisma";
import { getTodayWindow } from "@/lib/schedule-generation";

const DEMO_USER_ID = "demo-user";

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
  const patient = await prisma.patient.findFirst({
    where: {
      id,
      createdByUserId: DEMO_USER_ID,
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

  if (!patient) {
    notFound();
  }

  const statusGroups = STATUS_ORDER.map((status) => ({
    status,
    doseEvents: patient.doseEvents.filter((doseEvent) => doseEvent.status === status),
  })).filter((group) => group.doseEvents.length > 0);

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <h1>Today&apos;s schedule</h1>
          <p>{patient.fullName}</p>
        </div>
        <ScheduleActions patientId={patient.id} />
      </header>

      {patient.doseEvents.length === 0 ? (
        <section className="empty-state">
          <h2>No doses generated for today</h2>
          <p>Generate a schedule from this patient&apos;s active medicines and timings.</p>
          <ScheduleGenerateButton patientId={patient.id} />
        </section>
      ) : (
        <section className="schedule-list" aria-label="Today&apos;s dose schedule">
          {statusGroups.map((group) => (
            <div className="schedule-group" key={group.status}>
              <h2>{group.status}</h2>
              <div className="dose-list">
                {group.doseEvents.map((doseEvent) => (
                  <DoseEventCard key={doseEvent.id} doseEvent={doseEvent} />
                ))}
              </div>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
