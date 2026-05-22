import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PatientDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PatientDetailPage({ params }: PatientDetailPageProps) {
  const { id } = await params;
  const currentUser = await requireCurrentUser();
  const patient = await prisma.patient.findFirst({
    where: {
      id,
      members: {
        some: {
          userId: currentUser.id,
        },
      },
    },
  });

  if (!patient) {
    notFound();
  }

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <h1>{patient.fullName}</h1>
          <p>{patient.relationship || "Patient profile"}</p>
        </div>
        <Link className="secondary-button" href="/patients">
          Back to patients
        </Link>
      </header>

      <section className="detail-panel">
        <h2>Profile</h2>
        <dl className="detail-grid">
          <div>
            <dt>Age</dt>
            <dd>{patient.age ?? "Not set"}</dd>
          </div>
          <div>
            <dt>Phone</dt>
            <dd>{patient.phoneNumber || "Not set"}</dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>{patient.createdAt.toLocaleDateString()}</dd>
          </div>
          <div>
            <dt>Owner</dt>
            <dd>{patient.createdByUserId}</dd>
          </div>
        </dl>

        {patient.notes ? (
          <div className="detail-notes">
            <dt>Notes</dt>
            <p>{patient.notes}</p>
          </div>
        ) : null}
      </section>

      <section className="detail-panel medicine-nav-panel">
        <div>
          <h2>Dashboard</h2>
          <p>Review what is due, missed, completed, skipped, and next for today.</p>
        </div>
        <Link className="primary-button" href={`/patients/${patient.id}/dashboard`}>
          View dashboard
        </Link>
      </section>

      <section className="detail-panel medicine-nav-panel">
        <div>
          <h2>Medicines</h2>
          <p>Add and review manually entered medicines for this patient.</p>
        </div>
        <Link className="primary-button" href={`/patients/${patient.id}/medicines`}>
          View medicines
        </Link>
      </section>

      <section className="detail-panel medicine-nav-panel">
        <div>
          <h2>Schedule</h2>
          <p>Generate dose events and review today&apos;s medicine schedule.</p>
        </div>
        <Link className="primary-button" href={`/patients/${patient.id}/schedule`}>
          View schedule
        </Link>
      </section>

      <section className="detail-panel medicine-nav-panel">
        <div>
          <h2>BP readings</h2>
          <p>Record and review manually entered BP readings for this patient.</p>
        </div>
        <Link className="primary-button" href={`/patients/${patient.id}/bp-readings`}>
          View BP readings
        </Link>
      </section>

      <section className="detail-panel medicine-nav-panel">
        <div>
          <h2>Follow-ups</h2>
          <p>Record and review doctor follow-up appointments for this patient.</p>
        </div>
        <Link className="primary-button" href={`/patients/${patient.id}/follow-ups`}>
          View follow-ups
        </Link>
      </section>
    </main>
  );
}
