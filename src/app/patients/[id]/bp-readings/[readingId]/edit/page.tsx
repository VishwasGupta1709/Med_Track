import Link from "next/link";
import { notFound } from "next/navigation";
import { BPReadingForm } from "@/components/BPReadingForm";
import { prisma } from "@/lib/prisma";

const DEMO_USER_ID = "demo-user";

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
  const patient = await prisma.patient.findFirst({
    where: {
      id,
      createdByUserId: DEMO_USER_ID,
    },
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
