import Link from "next/link";
import type { FollowUp } from "@prisma/client";

type FollowUpCardProps = {
  patientId: string;
  followUp: FollowUp;
  canManageFollowUps: boolean;
};

function formatDateTime(value: Date | string) {
  return new Date(value).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function FollowUpCard({ patientId, followUp, canManageFollowUps }: FollowUpCardProps) {
  return (
    <article className="medicine-card">
      <div className="medicine-card-header">
        <div>
          <h2>Follow-up appointment</h2>
          <p>{formatDateTime(followUp.appointmentAt)}</p>
        </div>
      </div>

      <dl className="medicine-details">
        {followUp.doctorName ? (
          <div>
            <dt>Doctor</dt>
            <dd>{followUp.doctorName}</dd>
          </div>
        ) : null}
        {followUp.hospitalName ? (
          <div>
            <dt>Hospital</dt>
            <dd>{followUp.hospitalName}</dd>
          </div>
        ) : null}
        {followUp.reason ? (
          <div>
            <dt>Reason</dt>
            <dd>{followUp.reason}</dd>
          </div>
        ) : null}
      </dl>

      {followUp.notes ? <p className="medicine-instructions">{followUp.notes}</p> : null}

      {canManageFollowUps ? (
        <div className="schedule-action-item">
          <Link
            className="secondary-button"
            href={`/patients/${patientId}/follow-ups/${followUp.id}/edit`}
          >
            Edit follow-up
          </Link>
        </div>
      ) : null}
    </article>
  );
}
