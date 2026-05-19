import Link from "next/link";
import { notFound } from "next/navigation";
import { BPReadingForm } from "@/components/BPReadingForm";
import { prisma } from "@/lib/prisma";

const DEMO_USER_ID = "demo-user";

type NewBPReadingPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function NewBPReadingPage({ params }: NewBPReadingPageProps) {
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
          <h1>New BP reading</h1>
          <p>{patient.fullName}</p>
        </div>
        <div className="header-actions">
          <Link className="secondary-button" href={`/patients/${patient.id}/bp-readings`}>
            Back to BP readings
          </Link>
          <Link className="secondary-button" href={`/patients/${patient.id}`}>
            Back to patient
          </Link>
        </div>
      </header>

      <section className="form-panel">
        <BPReadingForm patientId={patient.id} />
      </section>
    </main>
  );
}
