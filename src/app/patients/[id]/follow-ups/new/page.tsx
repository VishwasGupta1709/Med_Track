import Link from "next/link";
import { notFound } from "next/navigation";
import { PatientRole } from "@prisma/client";
import { FollowUpForm } from "@/components/FollowUpForm";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getPatientMembership, hasPatientRole } from "@/lib/auth/patient-access";
import { prisma } from "@/lib/prisma";

const FOLLOW_UP_MANAGE_ROLES = [PatientRole.PRIMARY_CAREGIVER, PatientRole.CAREGIVER];

type NewFollowUpPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function NewFollowUpPage({ params }: NewFollowUpPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    notFound();
  }

  const membership = await getPatientMembership(id, user.id);

  if (!membership || !hasPatientRole(membership.role, FOLLOW_UP_MANAGE_ROLES)) {
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
          <h1>Add follow-up</h1>
          <p>{patient.fullName}</p>
        </div>
        <div className="header-actions">
          <Link className="secondary-button" href={`/patients/${patient.id}/follow-ups`}>
            Back to follow-ups
          </Link>
          <Link className="secondary-button" href={`/patients/${patient.id}`}>
            Back to patient
          </Link>
        </div>
      </header>

      <section className="form-panel">
        <FollowUpForm patientId={patient.id} />
      </section>
    </main>
  );
}
