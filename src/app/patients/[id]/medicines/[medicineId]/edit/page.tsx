import Link from "next/link";
import { notFound } from "next/navigation";
import { PatientRole } from "@prisma/client";
import { MedicineForm } from "@/components/MedicineForm";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getPatientMembership, hasPatientRole } from "@/lib/auth/patient-access";
import { prisma } from "@/lib/prisma";

const MEDICINE_MANAGE_ROLES = [PatientRole.PRIMARY_CAREGIVER];

type EditMedicinePageProps = {
  params: Promise<{
    id: string;
    medicineId: string;
  }>;
};

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function EditMedicinePage({ params }: EditMedicinePageProps) {
  const { id, medicineId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    notFound();
  }

  const membership = await getPatientMembership(id, user.id);

  if (!membership || !hasPatientRole(membership.role, MEDICINE_MANAGE_ROLES)) {
    notFound();
  }

  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      medicines: {
        where: {
          id: medicineId,
        },
        include: {
          timings: {
            where: { removedAt: null },
            orderBy: { timeOfDay: "asc" },
          },
        },
      },
    },
  });

  const medicine = patient?.medicines[0];

  if (!patient || !medicine) {
    notFound();
  }

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <h1>Edit medicine</h1>
          <p>{patient.fullName}</p>
        </div>
        <Link className="secondary-button" href={`/patients/${patient.id}/medicines`}>
          Back to medicines
        </Link>
      </header>

      <section className="form-panel">
        <MedicineForm
          mode="edit"
          patientId={patient.id}
          medicine={{
            id: medicine.id,
            name: medicine.name,
            dosage: medicine.dosage,
            form: medicine.form,
            frequency: medicine.frequency,
            foodInstruction: medicine.foodInstruction,
            instructions: medicine.instructions,
            startDate: formatDateInput(medicine.startDate),
            endDate: medicine.endDate ? formatDateInput(medicine.endDate) : "",
            timings: medicine.timings.map((timing) => ({
              id: timing.id,
              label: timing.label,
              timeOfDay: timing.timeOfDay,
            })),
          }}
        />
      </section>
    </main>
  );
}
