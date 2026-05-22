import Link from "next/link";
import { notFound } from "next/navigation";
import { PatientRole } from "@prisma/client";
import { MedicineCard } from "@/components/MedicineCard";
import { requireCurrentUser } from "@/lib/auth/current-user";
import {
  MANAGE_MEDICINE_ROLES,
  PatientAccessError,
  hasPatientRole,
  requirePatientMembership,
  VIEW_PATIENT_ROLES,
} from "@/lib/auth/patient-access";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PatientMedicinesPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PatientMedicinesPage({ params }: PatientMedicinesPageProps) {
  const { id } = await params;
  const currentUser = await requireCurrentUser();
  let role: PatientRole;

  try {
    const membership = await requirePatientMembership(id, currentUser.id, VIEW_PATIENT_ROLES);
    role = membership.role;
  } catch (error) {
    if (error instanceof PatientAccessError) {
      notFound();
    }

    throw error;
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

  const canManageMedicines = hasPatientRole(role, MANAGE_MEDICINE_ROLES);

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
            <MedicineCard key={medicine.id} patientId={patient.id} medicine={medicine} />
          ))}
        </section>
      )}
    </main>
  );
}
