import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

const DEMO_USER_ID = "demo-user";

export const dynamic = "force-dynamic";

type PatientDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PatientDetailPage({ params }: PatientDetailPageProps) {
  const { id } = await params;
  const patient = await prisma.patient.findFirst({
    where: {
      id,
      createdByUserId: DEMO_USER_ID,
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
          <h2>Medicines</h2>
          <p>Add and review manually entered medicines for this patient.</p>
        </div>
        <Link className="primary-button" href={`/patients/${patient.id}/medicines`}>
          View medicines
        </Link>
      </section>
    </main>
  );
}
