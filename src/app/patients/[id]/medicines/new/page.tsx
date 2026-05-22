import Link from "next/link";
import { notFound } from "next/navigation";
import { MedicineForm } from "@/components/MedicineForm";
import { requireCurrentUser } from "@/lib/auth/current-user";
import {
  MANAGE_MEDICINE_ROLES,
  PatientAccessError,
  requirePatientMembership,
} from "@/lib/auth/patient-access";
import { prisma } from "@/lib/prisma";

type NewMedicinePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function NewMedicinePage({ params }: NewMedicinePageProps) {
  const { id } = await params;
  const currentUser = await requireCurrentUser();

  try {
    await requirePatientMembership(id, currentUser.id, MANAGE_MEDICINE_ROLES);
  } catch (error) {
    if (error instanceof PatientAccessError) {
      notFound();
    }

    throw error;
  }

  const patient = await prisma.patient.findUnique({ where: { id } });

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
