import Link from "next/link";
import type { Patient } from "@prisma/client";

type PatientCardProps = {
  patient: Patient;
};

export function PatientCard({ patient }: PatientCardProps) {
  return (
    <Link className="patient-card" href={`/patients/${patient.id}`}>
      <div>
        <h2>{patient.fullName}</h2>
        <p>{patient.relationship || "Patient"}</p>
      </div>
      <dl>
        <div>
          <dt>Age</dt>
          <dd>{patient.age ?? "Not set"}</dd>
        </div>
        <div>
          <dt>Phone</dt>
          <dd>{patient.phoneNumber || "Not set"}</dd>
        </div>
      </dl>
    </Link>
  );
}
