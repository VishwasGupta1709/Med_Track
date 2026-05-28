import Link from "next/link";
import { notFound } from "next/navigation";
import { PatientRole } from "@prisma/client";
import { BPReadingCard } from "@/components/BPReadingCard";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getPatientMembership, hasPatientRole } from "@/lib/auth/patient-access";
import { prisma } from "@/lib/prisma";

const BP_READING_VIEW_ROLES = [
  PatientRole.PRIMARY_CAREGIVER,
  PatientRole.CAREGIVER,
  PatientRole.VIEWER,
];
const BP_READING_MANAGE_ROLES = [PatientRole.PRIMARY_CAREGIVER, PatientRole.CAREGIVER];

export const dynamic = "force-dynamic";

type PatientBPReadingsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PatientBPReadingsPage({ params }: PatientBPReadingsPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    notFound();
  }

  const membership = await getPatientMembership(id, user.id);

  if (!membership || !hasPatientRole(membership.role, BP_READING_VIEW_ROLES)) {
    notFound();
  }

  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      bpReadings: {
        orderBy: { measuredAt: "desc" },
      },
    },
  });

  if (!patient) {
    notFound();
  }

  const canManageBPReadings = hasPatientRole(membership.role, BP_READING_MANAGE_ROLES);

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <h1>BP readings</h1>
          <p>{patient.fullName}</p>
        </div>
        <div className="header-actions">
          <Link className="secondary-button" href={`/patients/${patient.id}`}>
            Back to patient
          </Link>
          {canManageBPReadings ? (
            <Link className="primary-button" href={`/patients/${patient.id}/bp-readings/new`}>
              Add BP reading
            </Link>
          ) : null}
        </div>
      </header>

      {patient.bpReadings.length === 0 ? (
        <section className="empty-state">
          <h2>No BP readings yet</h2>
          <p>Record BP readings manually to keep a history for this patient.</p>
          <div className="empty-state-actions">
            {canManageBPReadings ? (
              <Link className="primary-button" href={`/patients/${patient.id}/bp-readings/new`}>
                Add BP reading
              </Link>
            ) : null}
            <Link className="secondary-button" href={`/patients/${patient.id}`}>
              Back to patient
            </Link>
          </div>
        </section>
      ) : (
        <section className="medicine-list" aria-label="BP reading history">
          {patient.bpReadings.map((bpReading) => (
            <BPReadingCard
              bpReading={bpReading}
              canManageBPReadings={canManageBPReadings}
              key={bpReading.id}
              patientId={patient.id}
            />
          ))}
        </section>
      )}
    </main>
  );
}
