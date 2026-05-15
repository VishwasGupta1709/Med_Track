import Link from "next/link";
import { DashboardPatientCard } from "@/components/DashboardPatientCard";
import { DOSE_STATUS } from "@/lib/dose-status";
import { prisma } from "@/lib/prisma";
import { getTodayWindow } from "@/lib/schedule-generation";

const DEMO_USER_ID = "demo-user";
const DASHBOARD_STATUSES = [
  DOSE_STATUS.PENDING,
  DOSE_STATUS.DUE,
  DOSE_STATUS.TAKEN,
  DOSE_STATUS.SKIPPED,
  DOSE_STATUS.MISSED,
] as const;

type DashboardStatus = (typeof DASHBOARD_STATUSES)[number];
type StatusCounts = Record<DashboardStatus, number>;
type DashboardDoseEvent = {
  scheduledAt: Date;
  status: string;
  medicineNameSnapshot: string;
  dosageSnapshot: string | null;
  timingLabelSnapshot: string | null;
  timingTimeSnapshot: string;
  patientId: string;
  patientName: string;
};

export const dynamic = "force-dynamic";

function createStatusCounts(): StatusCounts {
  return {
    [DOSE_STATUS.PENDING]: 0,
    [DOSE_STATUS.DUE]: 0,
    [DOSE_STATUS.TAKEN]: 0,
    [DOSE_STATUS.SKIPPED]: 0,
    [DOSE_STATUS.MISSED]: 0,
  };
}

function countStatuses(doseEvents: { status: string }[]) {
  const counts = createStatusCounts();

  for (const doseEvent of doseEvents) {
    if (DASHBOARD_STATUSES.includes(doseEvent.status as DashboardStatus)) {
      counts[doseEvent.status as DashboardStatus] += 1;
    }
  }

  return counts;
}

function findNextDose<T extends { scheduledAt: Date; status: string }>(doseEvents: T[], now: Date) {
  const dueDose = doseEvents.find((doseEvent) => doseEvent.status === DOSE_STATUS.DUE);

  if (dueDose) {
    return dueDose;
  }

  return (
    doseEvents.find(
      (doseEvent) =>
        doseEvent.status === DOSE_STATUS.PENDING && doseEvent.scheduledAt.getTime() >= now.getTime(),
    ) || null
  );
}

function formatTime(date: Date) {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function DashboardPage() {
  const now = new Date();
  const today = getTodayWindow(now);
  const patients = await prisma.patient.findMany({
    where: { createdByUserId: DEMO_USER_ID },
    include: {
      medicines: {
        where: { status: "ACTIVE" },
        select: { id: true },
      },
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
    orderBy: { createdAt: "desc" },
  });

  const allDoseEvents: DashboardDoseEvent[] = patients.flatMap((patient) =>
    patient.doseEvents.map((doseEvent) => ({
      scheduledAt: doseEvent.scheduledAt,
      status: doseEvent.status,
      medicineNameSnapshot: doseEvent.medicineNameSnapshot,
      dosageSnapshot: doseEvent.dosageSnapshot,
      timingLabelSnapshot: doseEvent.timingLabelSnapshot,
      timingTimeSnapshot: doseEvent.timingTimeSnapshot,
      patientId: patient.id,
      patientName: patient.fullName,
    })),
  );
  const totalStatusCounts = countStatuses(allDoseEvents);
  const activeMedicineCount = patients.reduce((total, patient) => total + patient.medicines.length, 0);
  const nextDose = findNextDose(allDoseEvents, now);

  return (
    <main className="page dashboard-page">
      <header className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Today&apos;s medicine status for demo-user patients.</p>
        </div>
        <div className="header-actions">
          <Link className="secondary-button" href="/patients">
            View patients
          </Link>
          <Link className="primary-button" href="/patients/new">
            Add patient
          </Link>
        </div>
      </header>

      {patients.length === 0 ? (
        <section className="empty-state">
          <h2>No patients yet</h2>
          <p>Create a patient profile to start tracking medicines and today&apos;s schedule.</p>
          <Link className="primary-button" href="/patients/new">
            Create patient
          </Link>
        </section>
      ) : (
        <>
          <section className="dashboard-summary-grid" aria-label="Dashboard summary">
            <dl className="dashboard-summary-card">
              <dt>Patients</dt>
              <dd>{patients.length}</dd>
            </dl>
            <dl className="dashboard-summary-card">
              <dt>Active medicines</dt>
              <dd>{activeMedicineCount}</dd>
            </dl>
            <dl className="dashboard-summary-card">
              <dt>Doses today</dt>
              <dd>{allDoseEvents.length}</dd>
            </dl>
          </section>

          <section className="dashboard-section" aria-labelledby="today-status-heading">
            <div className="section-heading">
              <h2 id="today-status-heading">Today&apos;s dose summary</h2>
            </div>
            <div className="dashboard-status-grid">
              {DASHBOARD_STATUSES.map((status) => (
                <dl className="dashboard-status-card" key={status}>
                  <dt>{status}</dt>
                  <dd>{totalStatusCounts[status]}</dd>
                </dl>
              ))}
            </div>
          </section>

          <section className="dashboard-section" aria-labelledby="next-dose-heading">
            <div className="section-heading">
              <h2 id="next-dose-heading">Next upcoming dose</h2>
            </div>
            <div className="dashboard-next-dose">
              {nextDose ? (
                <>
                  <div>
                    <strong>{formatTime(nextDose.scheduledAt)}</strong>
                    <h3>{nextDose.medicineNameSnapshot}</h3>
                    <p>
                      {nextDose.patientName}
                      {nextDose.dosageSnapshot ? ` - ${nextDose.dosageSnapshot}` : ""} -{" "}
                      {nextDose.timingLabelSnapshot || nextDose.timingTimeSnapshot}
                    </p>
                  </div>
                  <Link className="secondary-button" href={`/patients/${nextDose.patientId}/schedule`}>
                    View schedule
                  </Link>
                </>
              ) : (
                <p>No upcoming doses remaining today.</p>
              )}
            </div>
          </section>

          <section className="dashboard-section" aria-labelledby="patient-summary-heading">
            <div className="section-heading">
              <h2 id="patient-summary-heading">Patient summary</h2>
            </div>
            <div className="dashboard-patient-list">
              {patients.map((patient) => {
                const statusCounts = countStatuses(patient.doseEvents);
                const patientNextDose = findNextDose(patient.doseEvents, now);

                return (
                  <DashboardPatientCard
                    key={patient.id}
                    patient={patient}
                    activeMedicineCount={patient.medicines.length}
                    todayDoseCount={patient.doseEvents.length}
                    statusCounts={statusCounts}
                    nextDose={patientNextDose}
                  />
                );
              })}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
