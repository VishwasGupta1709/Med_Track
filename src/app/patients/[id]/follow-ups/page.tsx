import Link from "next/link";
import { notFound } from "next/navigation";
import { FollowUpCard } from "@/components/FollowUpCard";
import { prisma } from "@/lib/prisma";

const DEMO_USER_ID = "demo-user";

export const dynamic = "force-dynamic";

type PatientFollowUpsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

async function getFollowUps(patientId: string) {
  return prisma.followUp.findMany({
    where: { patientId },
    orderBy: { appointmentAt: "asc" },
  });
}

export default async function PatientFollowUpsPage({ params }: PatientFollowUpsPageProps) {
  const { id } = await params;
  const patient = await prisma.patient.findFirst({
    where: {
      id,
      createdByUserId: DEMO_USER_ID,
    },
    select: {
      id: true,
      fullName: true,
    },
  });

  if (!patient) {
    notFound();
  }

  const followUps = await getFollowUps(patient.id);

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <h1>Follow-ups</h1>
          <p>Track doctor follow-up appointments for {patient.fullName}.</p>
        </div>
        <div className="header-actions">
          <Link className="secondary-button" href={`/patients/${patient.id}`}>
            Back to patient
          </Link>
          <Link className="primary-button" href={`/patients/${patient.id}/follow-ups/new`}>
            Add follow-up
          </Link>
        </div>
      </header>

      {followUps.length === 0 ? (
        <section className="empty-state">
          <h2>No follow-ups yet</h2>
          <p>
            Record upcoming doctor or hospital follow-ups so the family can keep appointment
            details handy.
          </p>
          <div className="header-actions">
            <Link className="primary-button" href={`/patients/${patient.id}/follow-ups/new`}>
              Add follow-up
            </Link>
            <Link className="secondary-button" href={`/patients/${patient.id}`}>
              Back to patient
            </Link>
          </div>
        </section>
      ) : (
        <section className="medicine-list" aria-label="Follow-up appointments">
          {followUps.map((followUp) => (
            <FollowUpCard followUp={followUp} key={followUp.id} patientId={patient.id} />
          ))}
        </section>
      )}
    </main>
  );
}
