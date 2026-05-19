import Link from "next/link";
import type { Medicine, MedicineTiming } from "@prisma/client";
import { MedicineStopAction } from "@/components/MedicineStopAction";

type MedicineWithTimings = Medicine & {
  timings: MedicineTiming[];
};

type MedicineCardProps = {
  patientId: string;
  medicine: MedicineWithTimings;
};

function formatDate(date: Date) {
  return date.toLocaleDateString();
}

function formatFrequency(frequency: string) {
  const normalizedFrequency = frequency.trim();

  if (/^[1-9]\d*$/.test(normalizedFrequency)) {
    const dailyCount = Number(normalizedFrequency);
    return dailyCount === 1 ? "Once daily" : `${dailyCount} times daily`;
  }

  return frequency;
}

export function MedicineCard({ patientId, medicine }: MedicineCardProps) {
  return (
    <article className="medicine-card">
      <div className="medicine-card-header">
        <div>
          <h2>{medicine.name}</h2>
          <p>{medicine.dosage || "Dosage not set"}</p>
        </div>
        <span className="status-pill">{medicine.status}</span>
      </div>

      <dl className="medicine-details">
        {medicine.form ? (
          <div>
            <dt>Form</dt>
            <dd>{medicine.form}</dd>
          </div>
        ) : null}
        {medicine.frequency ? (
          <div>
            <dt>Frequency</dt>
            <dd>{formatFrequency(medicine.frequency)}</dd>
          </div>
        ) : null}
        {medicine.foodInstruction ? (
          <div>
            <dt>Food</dt>
            <dd>{medicine.foodInstruction}</dd>
          </div>
        ) : null}
        <div>
          <dt>Start</dt>
          <dd>{formatDate(medicine.startDate)}</dd>
        </div>
        <div>
          <dt>End</dt>
          <dd>{medicine.endDate ? formatDate(medicine.endDate) : "No end date"}</dd>
        </div>
      </dl>

      <div className="timing-list" aria-label={`Timings for ${medicine.name}`}>
        {medicine.timings.map((timing) => (
          <span className="timing-pill" key={timing.id}>
            {timing.label ? `${timing.label}: ` : ""}
            {timing.timeOfDay}
          </span>
        ))}
      </div>

      {medicine.instructions ? <p className="medicine-instructions">{medicine.instructions}</p> : null}

      <div className="schedule-action-item">
        <Link
          className="secondary-button"
          href={`/patients/${patientId}/medicines/${medicine.id}/edit`}
        >
          Edit medicine
        </Link>
      </div>

      <MedicineStopAction
        patientId={patientId}
        medicineId={medicine.id}
        medicineStatus={medicine.status}
      />
    </article>
  );
}
