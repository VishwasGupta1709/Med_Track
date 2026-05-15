import type { DoseEvent } from "@prisma/client";
import { DoseEventActions } from "@/components/DoseEventActions";
import { ACTIONABLE_DOSE_STATUSES } from "@/lib/dose-status";

type DoseEventCardProps = {
  doseEvent: DoseEvent;
};

function formatTime(date: Date) {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateTime(date: Date) {
  return date.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function DoseEventCard({ doseEvent }: DoseEventCardProps) {
  const canAct = (ACTIONABLE_DOSE_STATUSES as readonly string[]).includes(doseEvent.status);

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

        {doseEvent.missedAt ? (
          <dl className="confirmation-details missed-details">
            <div>
              <dt>Missed</dt>
              <dd>{formatDateTime(doseEvent.missedAt)}</dd>
            </div>
            <div>
              <dt>Reason</dt>
              <dd>Marked missed after cutoff</dd>
            </div>
          </dl>
        ) : null}

        {doseEvent.takenAt || doseEvent.skippedAt ? (
          <dl className="confirmation-details">
            {doseEvent.takenAt ? (
              <div>
                <dt>Taken</dt>
                <dd>{formatDateTime(doseEvent.takenAt)}</dd>
              </div>
            ) : null}
            {doseEvent.skippedAt ? (
              <div>
                <dt>Skipped</dt>
                <dd>{formatDateTime(doseEvent.skippedAt)}</dd>
              </div>
            ) : null}
            {doseEvent.confirmedByUserId ? (
              <div>
                <dt>Confirmed by</dt>
                <dd>{doseEvent.confirmedByUserId}</dd>
              </div>
            ) : null}
            {doseEvent.skippedReason ? (
              <div>
                <dt>Reason</dt>
                <dd>{doseEvent.skippedReason}</dd>
              </div>
            ) : null}
            {doseEvent.confirmationNote ? (
              <div>
                <dt>Note</dt>
                <dd>{doseEvent.confirmationNote}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        {canAct ? <DoseEventActions doseEventId={doseEvent.id} /> : null}
      </div>
    </article>
  );
}
