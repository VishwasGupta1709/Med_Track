import Link from "next/link";
import { notFound } from "next/navigation";
import { PatientRole } from "@prisma/client";
import { MedicineCard } from "@/components/MedicineCard";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getPatientMembership, hasPatientRole } from "@/lib/auth/patient-access";
import { prisma } from "@/lib/prisma";

const MEDICINE_VIEW_ROLES = [
  PatientRole.PRIMARY_CAREGIVER,
  PatientRole.CAREGIVER,
  PatientRole.VIEWER,
];
const MEDICINE_MANAGE_ROLES = [PatientRole.PRIMARY_CAREGIVER];

export const dynamic = "force-dynamic";

type PatientMedicinesPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PatientMedicinesPage({ params }: PatientMedicinesPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    notFound();
  }

  const membership = await getPatientMembership(id, user.id);

  if (!membership || !hasPatientRole(membership.role, MEDICINE_VIEW_ROLES)) {
    notFound();
  }

  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      medicines: {
        include: {
          timings: {
            where: { removedAt: null },
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

  const canManageMedicines = hasPatientRole(membership.role, MEDICINE_MANAGE_ROLES);

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
          {canManageMedicines ? (
            <Link className="primary-button" href={`/patients/${patient.id}/medicines/new`}>
              Add medicine
            </Link>
          ) : null}
        </div>
      </header>

      {patient.medicines.length === 0 ? (
        <section className="empty-state">
          <h2>No medicines yet</h2>
          <p>Add medicines manually, then generate a schedule from active medicines and timings.</p>
          <div className="empty-state-actions">
            {canManageMedicines ? (
              <Link className="primary-button" href={`/patients/${patient.id}/medicines/new`}>
                Add medicine
              </Link>
            ) : null}
            <Link className="secondary-button" href={`/patients/${patient.id}`}>
              Back to patient
            </Link>
          </div>
        </section>
      ) : (
        <section className="medicine-list" aria-label="Medicine list">
          {patient.medicines.map((medicine) => (
            <MedicineCard
              canManageMedicines={canManageMedicines}
              key={medicine.id}
              patientId={patient.id}
              medicine={medicine}
            />
          ))}
        </section>
      )}
    </main>
  );
}
