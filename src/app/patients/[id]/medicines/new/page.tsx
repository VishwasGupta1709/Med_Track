import Link from "next/link";
import { notFound } from "next/navigation";
import { PatientRole } from "@prisma/client";
import { MedicineForm } from "@/components/MedicineForm";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getPatientMembership, hasPatientRole } from "@/lib/auth/patient-access";
import { prisma } from "@/lib/prisma";

const MEDICINE_MANAGE_ROLES = [PatientRole.PRIMARY_CAREGIVER];

type NewMedicinePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function NewMedicinePage({ params }: NewMedicinePageProps) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    notFound();
  }

  const membership = await getPatientMembership(id, user.id);

  if (!membership || !hasPatientRole(membership.role, MEDICINE_MANAGE_ROLES)) {
    notFound();
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
