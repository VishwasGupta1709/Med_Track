import Link from "next/link";
import { notFound } from "next/navigation";
import { MedicineForm } from "@/components/MedicineForm";
import { prisma } from "@/lib/prisma";

const DEMO_USER_ID = "demo-user";

type NewMedicinePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function NewMedicinePage({ params }: NewMedicinePageProps) {
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
          <h1>New medicine</h1>
          <p>{patient.fullName}</p>
        </div>
        <Link className="secondary-button" href={`/patients/${patient.id}/medicines`}>
          Back to medicines
        </Link>
      </header>

      <section className="form-panel">
        <MedicineForm patientId={patient.id} />
      </section>
    </main>
  );
}
