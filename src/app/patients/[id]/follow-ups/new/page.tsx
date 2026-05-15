import Link from "next/link";
import { notFound } from "next/navigation";
import { FollowUpForm } from "@/components/FollowUpForm";
import { prisma } from "@/lib/prisma";

const DEMO_USER_ID = "demo-user";

type NewFollowUpPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function NewFollowUpPage({ params }: NewFollowUpPageProps) {
  const { id } = await params;
  const patient = await prisma.patient.findFirst({
    where: {
      id,
      createdByUserId: DEMO_USER_ID,
    },
  });

  if (!patient) {
    notFound();
  }

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <h1>Add follow-up</h1>
          <p>{patient.fullName}</p>
        </div>
        <Link className="secondary-button" href={`/patients/${patient.id}/follow-ups`}>
          Back to follow-ups
        </Link>
      </header>

      <section className="form-panel">
        <FollowUpForm patientId={patient.id} />
      </section>
    </main>
  );
}
