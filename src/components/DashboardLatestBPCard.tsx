import Link from "next/link";

type DashboardLatestBPReading = {
  systolic: number;
  diastolic: number;
  pulse: number | null;
  measuredAt: Date;
  patientId: string;
  patientName: string;
};

type DashboardLatestBPCardProps = {
  latestBPReading: DashboardLatestBPReading | null;
};

function formatDateTime(date: Date) {
  return date.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function DashboardLatestBPCard({ latestBPReading }: DashboardLatestBPCardProps) {
  return (
    <section className="dashboard-section" aria-labelledby="latest-bp-heading">
      <div className="section-heading">
        <h2 id="latest-bp-heading">Latest BP reading</h2>
      </div>
      <div className="dashboard-latest-bp">
        {latestBPReading ? (
          <>
            <div>
              <strong>
                {latestBPReading.systolic}/{latestBPReading.diastolic} mmHg
              </strong>
              <h3>{latestBPReading.patientName}</h3>
              <p>
                {formatDateTime(latestBPReading.measuredAt)}
                {latestBPReading.pulse ? ` - Pulse ${latestBPReading.pulse} bpm` : ""}
              </p>
            </div>
            <Link className="secondary-button" href={`/patients/${latestBPReading.patientId}/bp-readings`}>
              View BP history
            </Link>
          </>
        ) : (
          <>
            <p>No BP readings recorded yet.</p>
            <Link className="secondary-button" href="/patients">
              View patients
            </Link>
          </>
        )}
      </div>
    </section>
  );
}
