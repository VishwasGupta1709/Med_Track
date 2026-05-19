import Link from "next/link";
import { notFound } from "next/navigation";
import { DoseEventCard } from "@/components/DoseEventCard";
import { createPatientDashboardSummary } from "@/lib/patient-dashboard-summary";
import { prisma } from "@/lib/prisma";
import { getTodayWindow } from "@/lib/schedule-generation";
import { refreshTodayScheduleStatusesForPatient } from "@/lib/today-schedule-status-processing";

const DEMO_USER_ID = "demo-user";

export const dynamic = "force-dynamic";

type PatientDashboardPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatTime(date: Date) {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DashboardDoseSection({
  title,
  emptyMessage,
  doseEvents,
}: {
  title: string;
  emptyMessage: string;
  doseEvents: Parameters<typeof DoseEventCard>[0]["doseEvent"][];
}) {
  return (
    <section className="dashboard-section" aria-labelledby={`${title.toLowerCase().replace(/\s+/g, "-")}-heading`}>
      <div className="section-heading">
        <h2 id={`${title.toLowerCase().replace(/\s+/g, "-")}-heading`}>{title}</h2>
      </div>
      {doseEvents.length === 0 ? (
        <div className="dashboard-next-dose">
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <div className="dose-list">
          {doseEvents.map((doseEvent) => (
            <DoseEventCard key={doseEvent.id} doseEvent={doseEvent} />
          ))}
        </div>
      )}
    </section>
  );
}

export default async function PatientDashboardPage({ params }: PatientDashboardPageProps) {
  const { id } = await params;
  const now = new Date();
  const today = getTodayWindow(now);
  const patient = await prisma.patient.findFirst({
    where: {
      id,
      createdByUserId: DEMO_USER_ID,
    },
    select: { id: true },
  });

  if (!patient) {
    notFound();
  }

  await refreshTodayScheduleStatusesForPatient(prisma, patient.id, now);

  const patientWithDoseEvents = await prisma.patient.findFirst({
    where: {
      id: patient.id,
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

  if (!patientWithDoseEvents) {
    notFound();
  }

  const dashboardSummary = createPatientDashboardSummary(patientWithDoseEvents.doseEvents, now);

  return (
    <main className="page dashboard-page">
      <header className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>{patientWithDoseEvents.fullName}</p>
        </div>
        <div className="header-actions">
          <Link className="secondary-button" href={`/patients/${patientWithDoseEvents.id}`}>
            Back to patient
          </Link>
          <Link className="primary-button" href={`/patients/${patientWithDoseEvents.id}/schedule`}>
            Today&apos;s schedule
          </Link>
        </div>
      </header>

      <section className="dashboard-section" aria-labelledby="schedule-status-heading">
        <div className="dashboard-next-dose">
          <div>
            <strong>{dashboardSummary.summaryLabel}</strong>
            <h2 id="schedule-status-heading">Medicine schedule status</h2>
            <p>Today&apos;s dose status after automatic refresh.</p>
          </div>
        </div>
      </section>

      <section className="dashboard-summary-grid" aria-label="Dashboard summary">
        <dl className="dashboard-summary-card">
          <dt>Due now</dt>
          <dd>{dashboardSummary.dueNow.length}</dd>
        </dl>
        <dl className="dashboard-summary-card">
          <dt>Missed today</dt>
          <dd>{dashboardSummary.missedToday.length}</dd>
        </dl>
        <dl className="dashboard-summary-card">
          <dt>Next dose</dt>
          <dd>
            {dashboardSummary.nextUpcomingDose
              ? formatTime(dashboardSummary.nextUpcomingDose.scheduledAt)
              : "None"}
          </dd>
        </dl>
        <dl className="dashboard-summary-card">
          <dt>Completed today</dt>
          <dd>{dashboardSummary.completedToday.length}</dd>
        </dl>
        <dl className="dashboard-summary-card">
          <dt>Skipped today</dt>
          <dd>{dashboardSummary.skippedToday.length}</dd>
        </dl>
      </section>

      <DashboardDoseSection
        title="Due now"
        emptyMessage="No doses need attention right now."
        doseEvents={dashboardSummary.dueNow}
      />
      <DashboardDoseSection
        title="Missed today"
        emptyMessage="No missed doses today."
        doseEvents={dashboardSummary.missedToday}
      />
      <DashboardDoseSection
        title="Next upcoming dose"
        emptyMessage="No upcoming doses remaining today."
        doseEvents={
          dashboardSummary.nextUpcomingDose ? [dashboardSummary.nextUpcomingDose] : []
        }
      />
      <DashboardDoseSection
        title="Completed today"
        emptyMessage="No completed doses today."
        doseEvents={dashboardSummary.completedToday}
      />
      <DashboardDoseSection
        title="Skipped today"
        emptyMessage="No skipped doses today."
        doseEvents={dashboardSummary.skippedToday}
      />
    </main>
  );
}
