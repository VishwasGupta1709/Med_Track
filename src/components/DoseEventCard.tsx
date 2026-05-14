import type { DoseEvent } from "@prisma/client";

type DoseEventCardProps = {
  doseEvent: DoseEvent;
};

function formatTime(date: Date) {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DoseEventCard({ doseEvent }: DoseEventCardProps) {
  return (
    <article className="dose-card">
      <div className="dose-time">
        <strong>{formatTime(doseEvent.scheduledAt)}</strong>
        <span>{doseEvent.timingLabelSnapshot || doseEvent.timingTimeSnapshot}</span>
      </div>

      <div className="dose-content">
        <div className="dose-card-header">
          <div>
            <h3>{doseEvent.medicineNameSnapshot}</h3>
            <p>{doseEvent.dosageSnapshot || "Dosage not set"}</p>
          </div>
          <span className="status-pill">{doseEvent.status}</span>
        </div>

        <dl className="dose-details">
          {doseEvent.foodInstructionSnapshot ? (
            <div>
              <dt>Food</dt>
              <dd>{doseEvent.foodInstructionSnapshot}</dd>
            </div>
          ) : null}
          <div>
            <dt>Timing</dt>
            <dd>
              {doseEvent.timingLabelSnapshot
                ? `${doseEvent.timingLabelSnapshot}: ${doseEvent.timingTimeSnapshot}`
                : doseEvent.timingTimeSnapshot}
            </dd>
          </div>
        </dl>

        {doseEvent.instructionsSnapshot ? (
          <p className="dose-instructions">{doseEvent.instructionsSnapshot}</p>
        ) : null}
      </div>
    </article>
  );
}
