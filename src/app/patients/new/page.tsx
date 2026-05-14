import Link from "next/link";
import { PatientForm } from "@/components/PatientForm";

export default function NewPatientPage() {
  return (
    <main className="page">
      <header className="page-header">
        <div>
          <h1>New patient</h1>
          <p>Add the basic profile details for a person in your care.</p>
        </div>
        <Link className="secondary-button" href="/patients">
          Back to patients
        </Link>
      </header>

      <section className="form-panel">
        <PatientForm />
      </section>
    </main>
  );
}
