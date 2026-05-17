import Link from "next/link";
import { notFound } from "next/navigation";
import { MedicineCard } from "@/components/MedicineCard";
import { prisma } from "@/lib/prisma";

const DEMO_USER_ID = "demo-user";

export const dynamic = "force-dynamic";

type PatientMedicinesPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PatientMedicinesPage({ params }: PatientMedicinesPageProps) {
  const { id } = await params;
  const patient = await prisma.patient.findFirst({
    where: {
      id,
      createdByUserId: DEMO_USER_ID,
    },
    include: {
      medicines: {
        include: {
          timings: {
            orderBy: { timeOfDay: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
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
          <h1>Medicines</h1>
          <p>{patient.fullName}</p>
        </div>
        <div className="header-actions">
          <Link className="secondary-button" href={`/patients/${patient.id}`}>
            Back to patient
          </Link>
          <Link className="primary-button" href={`/patients/${patient.id}/medicines/new`}>
            Add medicine
          </Link>
        </div>
      </header>

      {patient.medicines.length === 0 ? (
        <section className="empty-state">
          <h2>No medicines yet</h2>
          <p>Add the first medicine for this patient.</p>
          <Link className="primary-button" href={`/patients/${patient.id}/medicines/new`}>
            Add medicine
          </Link>
        </section>
      ) : (
        <section className="medicine-list" aria-label="Medicine list">
          {patient.medicines.map((medicine) => (
            <MedicineCard key={medicine.id} patientId={patient.id} medicine={medicine} />
          ))}
        </section>
      )}
    </main>
  );
}
