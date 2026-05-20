import Link from "next/link";
import { notFound } from "next/navigation";
import { FollowUpForm } from "@/components/FollowUpForm";
import { prisma } from "@/lib/prisma";

const DEMO_USER_ID = "demo-user";

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
  const patient = await prisma.patient.findFirst({
    where: {
      id,
      createdByUserId: DEMO_USER_ID,
    },
    include: {
      followUps: {
        where: { id: followUpId },
      },
    },
  });

  const followUp = patient?.followUps[0];

  if (!patient || !followUp) {
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
