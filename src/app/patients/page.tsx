import Link from "next/link";
import { PatientCard } from "@/components/PatientCard";
import { prisma } from "@/lib/prisma";

const DEMO_USER_ID = "demo-user";

export const dynamic = "force-dynamic";

export default async function PatientsPage() {
  const patients = await prisma.patient.findMany({
    where: { createdByUserId: DEMO_USER_ID },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <h1>Patients</h1>
          <p>Profiles for the people you help care for.</p>
        </div>
        <Link className="primary-button" href="/patients/new">
          Add patient
        </Link>
      </header>

      {patients.length === 0 ? (
        <section className="empty-state">
          <h2>No patients yet</h2>
          <p>Create the first patient profile to start tracking care.</p>
          <Link className="primary-button" href="/patients/new">
            Create patient
          </Link>
        </section>
      ) : (
        <section className="patient-grid" aria-label="Patient list">
          {patients.map((patient) => (
            <PatientCard key={patient.id} patient={patient} />
          ))}
        </section>
      )}
    </main>
  );
}
