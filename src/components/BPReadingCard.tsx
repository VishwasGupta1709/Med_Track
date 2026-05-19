import type { BPReading } from "@prisma/client";

type BPReadingCardProps = {
  bpReading: BPReading;
};

function formatDateTime(date: Date) {
  return date.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function BPReadingCard({ bpReading }: BPReadingCardProps) {
  return (
    <article className="bp-reading-card">
      <div className="medicine-card-header">
        <div>
          <h2>
            {bpReading.systolic}/{bpReading.diastolic} mmHg
          </h2>
          <p>Measured {formatDateTime(bpReading.measuredAt)}</p>
        </div>
      </div>

      <dl className="medicine-details">
        <div>
          <dt>Systolic</dt>
          <dd>{bpReading.systolic}</dd>
        </div>
        <div>
          <dt>Diastolic</dt>
          <dd>{bpReading.diastolic}</dd>
        </div>
        {bpReading.pulse ? (
          <div>
            <dt>Pulse</dt>
            <dd>{bpReading.pulse} bpm</dd>
          </div>
        ) : null}
      </dl>

      {bpReading.notes ? <p className="medicine-instructions">{bpReading.notes}</p> : null}
    </article>
  );
}
