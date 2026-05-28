import Link from "next/link";
import { notFound } from "next/navigation";
import { PatientRole } from "@prisma/client";
import { FollowUpForm } from "@/components/FollowUpForm";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getPatientMembership, hasPatientRole } from "@/lib/auth/patient-access";
import { prisma } from "@/lib/prisma";

const FOLLOW_UP_MANAGE_ROLES = [PatientRole.PRIMARY_CAREGIVER, PatientRole.CAREGIVER];

type EditFollowUpPageProps = {
  params: Promise<{
    id: string;
    followUpId: string;
  }>;
};

function formatDateTimeInput(date: Date) {
  const localDate = new Date(date);
  localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
  return localDate.toISOString().slice(0, 16);
}

export default async function EditFollowUpPage({ params }: EditFollowUpPageProps) {
  const { id, followUpId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    notFound();
  }

  const membership = await getPatientMembership(id, user.id);

  if (!membership || !hasPatientRole(membership.role, FOLLOW_UP_MANAGE_ROLES)) {
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

  const followUp = await prisma.followUp.findFirst({
    where: {
      id: followUpId,
      patientId: patient.id,
    },
  });

  if (!followUp) {
    notFound();
  }

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <h1>Edit follow-up</h1>
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
        <FollowUpForm
          mode="edit"
          patientId={patient.id}
          followUp={{
            id: followUp.id,
            appointmentAt: formatDateTimeInput(followUp.appointmentAt),
            doctorName: followUp.doctorName,
            hospitalName: followUp.hospitalName,
            reason: followUp.reason,
            notes: followUp.notes,
          }}
        />
      </section>
    </main>
  );
}
