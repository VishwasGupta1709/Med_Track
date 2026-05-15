import Link from "next/link";

type DueDoseAlertItem = {
  scheduledAt: Date;
  medicineNameSnapshot: string;
  dosageSnapshot: string | null;
  timingLabelSnapshot: string | null;
  timingTimeSnapshot: string;
  patientId: string;
  patientName: string;
};

type DueDoseAlertProps = {
  dueDoses: DueDoseAlertItem[];
};

function formatTime(date: Date) {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DueDoseAlert({ dueDoses }: DueDoseAlertProps) {
  if (dueDoses.length === 0) {
    return null;
  }

  return (
    <section className="due-alert" aria-labelledby="due-alert-heading">
      <div className="due-alert-heading">
        <div>
          <p>Needs attention</p>
          <h2 id="due-alert-heading">Due now</h2>
        </div>
        <strong>{dueDoses.length}</strong>
      </div>

      <div className="due-alert-list">
        {dueDoses.map((dose) => (
          <article
            className="due-alert-item"
            key={`${dose.patientId}-${dose.medicineNameSnapshot}-${dose.scheduledAt.toISOString()}`}
          >
            <div>
              <strong>{formatTime(dose.scheduledAt)}</strong>
              <h3>{dose.medicineNameSnapshot}</h3>
              <p>
                {dose.patientName}
                {dose.dosageSnapshot ? ` - ${dose.dosageSnapshot}` : ""} -{" "}
                {dose.timingLabelSnapshot || dose.timingTimeSnapshot}
              </p>
            </div>
            <Link className="secondary-button" href={`/patients/${dose.patientId}/schedule`}>
              View schedule
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
