import Link from "next/link";
import { PatientCard } from "@/components/PatientCard";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PatientsPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <main className="page">
        <section className="empty-state">
          <h1>Patients</h1>
          <p>Sign in to view patient profiles.</p>
          <Link className="primary-button" href="/sign-in">
            Sign in
          </Link>
        </section>
      </main>
    );
  }

  const patients = await prisma.patient.findMany({
    where: {
      members: {
        some: {
          userId: user.id,
        },
      },
    },
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
