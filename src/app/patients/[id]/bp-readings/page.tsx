import Link from "next/link";
import { notFound } from "next/navigation";
import { BPReadingCard } from "@/components/BPReadingCard";
import { prisma } from "@/lib/prisma";

const DEMO_USER_ID = "demo-user";

export const dynamic = "force-dynamic";

type PatientBPReadingsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PatientBPReadingsPage({ params }: PatientBPReadingsPageProps) {
  const { id } = await params;
  const patient = await prisma.patient.findFirst({
    where: {
      id,
      createdByUserId: DEMO_USER_ID,
    },
    include: {
      bpReadings: {
        orderBy: { measuredAt: "desc" },
      },
    },
  });

  if (!patient) {
    notFound();
  }

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <h1>BP readings</h1>
          <p>{patient.fullName}</p>
        </div>
        <div className="header-actions">
          <Link className="secondary-button" href={`/patients/${patient.id}`}>
            Back to patient
          </Link>
          <Link className="primary-button" href={`/patients/${patient.id}/bp-readings/new`}>
            Add BP reading
          </Link>
        </div>
      </header>

      {patient.bpReadings.length === 0 ? (
        <section className="empty-state">
          <h2>No BP readings yet</h2>
          <p>Record BP readings manually to keep a history for this patient.</p>
          <div className="empty-state-actions">
            <Link className="primary-button" href={`/patients/${patient.id}/bp-readings/new`}>
              Add BP reading
            </Link>
            <Link className="secondary-button" href={`/patients/${patient.id}`}>
              Back to patient
            </Link>
          </div>
        </section>
      ) : (
        <section className="medicine-list" aria-label="BP reading history">
          {patient.bpReadings.map((bpReading) => (
            <BPReadingCard bpReading={bpReading} key={bpReading.id} />
          ))}
        </section>
      )}
    </main>
  );
}
