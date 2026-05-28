import Link from "next/link";
import { notFound } from "next/navigation";
import { PatientRole } from "@prisma/client";
import { FollowUpCard } from "@/components/FollowUpCard";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getPatientMembership, hasPatientRole } from "@/lib/auth/patient-access";
import { prisma } from "@/lib/prisma";

const FOLLOW_UP_VIEW_ROLES = [
  PatientRole.PRIMARY_CAREGIVER,
  PatientRole.CAREGIVER,
  PatientRole.VIEWER,
];
const FOLLOW_UP_MANAGE_ROLES = [PatientRole.PRIMARY_CAREGIVER, PatientRole.CAREGIVER];

export const dynamic = "force-dynamic";

type PatientFollowUpsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

async function getFollowUps(patientId: string) {
  return prisma.followUp.findMany({
    where: { patientId },
    orderBy: { appointmentAt: "asc" },
  });
}

export default async function PatientFollowUpsPage({ params }: PatientFollowUpsPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    notFound();
  }

  const membership = await getPatientMembership(id, user.id);

  if (!membership || !hasPatientRole(membership.role, FOLLOW_UP_VIEW_ROLES)) {
    notFound();
  }

  const patient = await prisma.patient.findUnique({
    where: { id },
    select: {
      id: true,
      fullName: true,
    },
  });

  if (!patient) {
    notFound();
  }

  const followUps = await getFollowUps(patient.id);
  const canManageFollowUps = hasPatientRole(membership.role, FOLLOW_UP_MANAGE_ROLES);

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <h1>Follow-ups</h1>
          <p>Track doctor follow-up appointments for {patient.fullName}.</p>
        </div>
        <div className="header-actions">
          <Link className="secondary-button" href={`/patients/${patient.id}`}>
            Back to patient
          </Link>
          {canManageFollowUps ? (
            <Link className="primary-button" href={`/patients/${patient.id}/follow-ups/new`}>
              Add follow-up
            </Link>
          ) : null}
        </div>
      </header>

      {followUps.length === 0 ? (
        <section className="empty-state">
          <h2>No follow-ups yet</h2>
          <p>
            Record upcoming doctor or hospital follow-ups so the family can keep appointment
            details handy.
          </p>
          <div className="header-actions">
            {canManageFollowUps ? (
              <Link className="primary-button" href={`/patients/${patient.id}/follow-ups/new`}>
                Add follow-up
              </Link>
            ) : null}
            <Link className="secondary-button" href={`/patients/${patient.id}`}>
              Back to patient
            </Link>
          </div>
        </section>
      ) : (
        <section className="medicine-list" aria-label="Follow-up appointments">
          {followUps.map((followUp) => (
            <FollowUpCard
              canManageFollowUps={canManageFollowUps}
              followUp={followUp}
              key={followUp.id}
              patientId={patient.id}
            />
          ))}
        </section>
      )}
    </main>
  );
}
