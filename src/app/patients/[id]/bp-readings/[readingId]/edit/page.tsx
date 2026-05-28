import Link from "next/link";
import { notFound } from "next/navigation";
import { PatientRole } from "@prisma/client";
import { BPReadingForm } from "@/components/BPReadingForm";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getPatientMembership, hasPatientRole } from "@/lib/auth/patient-access";
import { prisma } from "@/lib/prisma";

const BP_READING_MANAGE_ROLES = [PatientRole.PRIMARY_CAREGIVER, PatientRole.CAREGIVER];

type EditBPReadingPageProps = {
  params: Promise<{
    id: string;
    readingId: string;
  }>;
};

function formatDateTimeInput(date: Date) {
  const localDate = new Date(date);
  localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
  return localDate.toISOString().slice(0, 16);
}

export default async function EditBPReadingPage({ params }: EditBPReadingPageProps) {
  const { id, readingId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    notFound();
  }

  const membership = await getPatientMembership(id, user.id);

  if (!membership || !hasPatientRole(membership.role, BP_READING_MANAGE_ROLES)) {
    notFound();
  }

  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      bpReadings: {
        where: { id: readingId },
      },
    },
  });

  const bpReading = patient?.bpReadings[0];

  if (!patient || !bpReading) {
    notFound();
  }

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <h1>Edit BP reading</h1>
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
        <BPReadingForm
          mode="edit"
          patientId={patient.id}
          reading={{
            id: bpReading.id,
            systolic: bpReading.systolic,
            diastolic: bpReading.diastolic,
            pulse: bpReading.pulse,
            measuredAt: formatDateTimeInput(bpReading.measuredAt),
            notes: bpReading.notes,
          }}
        />
      </section>
    </main>
  );
}
