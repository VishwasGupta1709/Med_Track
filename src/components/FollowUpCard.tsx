import type { FollowUp } from "@prisma/client";

type FollowUpCardProps = {
  followUp: FollowUp;
};

function formatDateTime(value: Date | string) {
  return new Date(value).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function FollowUpCard({ followUp }: FollowUpCardProps) {
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
    </article>
  );
}
