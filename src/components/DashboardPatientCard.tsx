import Link from "next/link";

type DashboardStatus = "PENDING" | "DUE" | "TAKEN" | "SKIPPED" | "MISSED";

type StatusCounts = Record<DashboardStatus, number>;

type DashboardDoseSummary = {
  scheduledAt: Date;
  medicineNameSnapshot: string;
  dosageSnapshot: string | null;
  timingLabelSnapshot: string | null;
  timingTimeSnapshot: string;
};

type DashboardPatientCardProps = {
  patient: {
    id: string;
    fullName: string;
    age: number | null;
    relationship: string | null;
  };
  activeMedicineCount: number;
  todayDoseCount: number;
  statusCounts: StatusCounts;
  nextDose: DashboardDoseSummary | null;
};

const STATUS_ORDER: DashboardStatus[] = ["PENDING", "DUE", "TAKEN", "SKIPPED", "MISSED"];

function formatTime(date: Date) {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DashboardPatientCard({
  patient,
  activeMedicineCount,
  todayDoseCount,
  statusCounts,
  nextDose,
}: DashboardPatientCardProps) {
  return (
    <article className="dashboard-patient-card">
      <div className="dashboard-patient-header">
        <div>
          <h2>{patient.fullName}</h2>
          <p>
            {patient.relationship || "Patient"}
            {patient.age ? ` - Age ${patient.age}` : ""}
          </p>
        </div>
        <dl className="dashboard-patient-metrics">
          <div>
            <dt>Medicines</dt>
            <dd>{activeMedicineCount}</dd>
          </div>
          <div>
            <dt>Today</dt>
            <dd>{todayDoseCount}</dd>
          </div>
        </dl>
      </div>

      <div className="dashboard-mini-status-grid" aria-label={`${patient.fullName} dose status`}>
        {STATUS_ORDER.map((status) => (
          <div key={status}>
            <span>{status}</span>
            <strong>{statusCounts[status]}</strong>
          </div>
        ))}
      </div>

      <dl className="dashboard-next-row">
        <dt>Next dose</dt>
        {nextDose ? (
          <dd>
            <strong>{formatTime(nextDose.scheduledAt)}</strong> {nextDose.medicineNameSnapshot}
            {nextDose.dosageSnapshot ? `, ${nextDose.dosageSnapshot}` : ""} -{" "}
            {nextDose.timingLabelSnapshot || nextDose.timingTimeSnapshot}
          </dd>
        ) : (
          <dd>No upcoming doses remaining today</dd>
        )}
      </dl>

      <div className="dashboard-quick-links">
        <Link className="secondary-button" href={`/patients/${patient.id}`}>
          Patient detail
        </Link>
        <Link className="secondary-button" href={`/patients/${patient.id}/medicines`}>
          Medicines
        </Link>
        <Link className="secondary-button" href={`/patients/${patient.id}/schedule`}>
          Schedule
        </Link>
      </div>
    </article>
  );
}
