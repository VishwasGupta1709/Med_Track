"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type FormErrors = Partial<
  Record<"systolic" | "diastolic" | "pulse" | "measuredAt" | "form", string>
>;

type BPReadingFormProps = {
  patientId: string;
} & (
  | {
      mode?: "create";
      reading?: never;
    }
  | {
      mode: "edit";
      reading: {
        id: string;
        systolic: number;
        diastolic: number;
        pulse?: number | null;
        measuredAt: string;
        notes?: string | null;
      };
    }
);

function getDefaultMeasuredAt() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

export function BPReadingForm(props: BPReadingFormProps) {
  const { patientId } = props;
  const isEditMode = props.mode === "edit";
  const reading = isEditMode ? props.reading : undefined;
  const router = useRouter();
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [measuredAt, setMeasuredAt] = useState(reading?.measuredAt || getDefaultMeasuredAt);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      systolic: String(formData.get("systolic") || ""),
      diastolic: String(formData.get("diastolic") || ""),
      pulse: String(formData.get("pulse") || ""),
      measuredAt,
      notes: String(formData.get("notes") || ""),
    };

    try {
      const requestUrl =
        props.mode === "edit"
          ? `/api/patients/${patientId}/bp-readings/${props.reading.id}`
          : `/api/patients/${patientId}/bp-readings`;
      const requestMethod = props.mode === "edit" ? "PATCH" : "POST";

      const response = await fetch(requestUrl, {
        method: requestMethod,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { errors?: FormErrors } | null;
        setErrors(
          body?.errors || {
            form: isEditMode ? "Unable to update BP reading." : "Unable to create BP reading.",
          },
        );
        return;
      }

      router.push(`/patients/${patientId}/bp-readings`);
      router.refresh();
    } catch {
      setErrors({ form: "Network error. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="patient-form" noValidate onSubmit={handleSubmit}>
      {errors.form ? <p className="form-error">{errors.form}</p> : null}
      <p className="helper-note">
        Enter values exactly as measured. MedTrack stores readings without interpreting them.
      </p>

      <div className="form-row">
        <label>
          Systolic (mmHg)
          <input
            name="systolic"
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            aria-describedby="systolic-error"
            defaultValue={reading?.systolic ?? ""}
          />
          {errors.systolic ? (
            <span className="field-error" id="systolic-error">
              {errors.systolic}
            </span>
          ) : null}
        </label>

        <label>
          Diastolic (mmHg)
          <input
            name="diastolic"
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            aria-describedby="diastolic-error"
            defaultValue={reading?.diastolic ?? ""}
          />
          {errors.diastolic ? (
            <span className="field-error" id="diastolic-error">
              {errors.diastolic}
            </span>
          ) : null}
        </label>
      </div>

      <div className="form-row">
        <label>
          Pulse (bpm, optional)
          <input
            name="pulse"
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            aria-describedby="pulse-error"
            defaultValue={reading?.pulse ?? ""}
          />
          {errors.pulse ? (
            <span className="field-error" id="pulse-error">
              {errors.pulse}
            </span>
          ) : null}
        </label>

        <label>
          Measured at
          <input
            name="measuredAt"
            type="datetime-local"
            value={measuredAt}
            onChange={(event) => setMeasuredAt(event.target.value)}
            aria-describedby="measuredAt-error"
          />
          {errors.measuredAt ? (
            <span className="field-error" id="measuredAt-error">
              {errors.measuredAt}
            </span>
          ) : null}
        </label>
      </div>

      <label>
        Notes
        <textarea
          name="notes"
          rows={4}
          placeholder="Optional care notes for this reading"
          defaultValue={reading?.notes || ""}
        />
      </label>

      <button className="primary-button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : isEditMode ? "Save BP reading" : "Add BP reading"}
      </button>
    </form>
  );
}
