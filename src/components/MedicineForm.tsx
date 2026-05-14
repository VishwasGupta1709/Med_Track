"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type FormErrors = Partial<
  Record<"name" | "startDate" | "endDate" | "timings" | "form", string>
>;

type TimingRow = {
  id: number;
  label: string;
  timeOfDay: string;
};

type MedicineFormProps = {
  patientId: string;
};

const emptyTiming = (id: number): TimingRow => ({
  id,
  label: "",
  timeOfDay: "",
});

export function MedicineForm({ patientId }: MedicineFormProps) {
  const router = useRouter();
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timings, setTimings] = useState<TimingRow[]>([emptyTiming(1)]);
  const [nextTimingId, setNextTimingId] = useState(2);

  function updateTiming(id: number, field: "label" | "timeOfDay", value: string) {
    setTimings((current) =>
      current.map((timing) => (timing.id === id ? { ...timing, [field]: value } : timing)),
    );
  }

  function addTiming() {
    setTimings((current) => [...current, emptyTiming(nextTimingId)]);
    setNextTimingId((current) => current + 1);
  }

  function removeTiming(id: number) {
    setTimings((current) => current.filter((timing) => timing.id !== id));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get("name") || ""),
      dosage: String(formData.get("dosage") || ""),
      form: String(formData.get("form") || ""),
      frequency: String(formData.get("frequency") || ""),
      foodInstruction: String(formData.get("foodInstruction") || ""),
      instructions: String(formData.get("instructions") || ""),
      startDate: String(formData.get("startDate") || ""),
      endDate: String(formData.get("endDate") || ""),
      timings: timings.map((timing) => ({
        label: timing.label,
        timeOfDay: timing.timeOfDay,
      })),
    };

    const clientErrors: FormErrors = {};
    if (!payload.name.trim()) {
      clientErrors.name = "Medicine name is required.";
    }
    if (!payload.startDate) {
      clientErrors.startDate = "Start date is required.";
    }
    if (!payload.timings.some((timing) => timing.timeOfDay)) {
      clientErrors.timings = "At least one timing is required.";
    }
    if (payload.startDate && payload.endDate && payload.endDate < payload.startDate) {
      clientErrors.endDate = "End date cannot be before start date.";
    }

    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      setIsSubmitting(false);
      return;
    }

    const response = await fetch(`/api/patients/${patientId}/medicines`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { errors?: FormErrors } | null;
      setErrors(body?.errors || { form: "Unable to create medicine." });
      setIsSubmitting(false);
      return;
    }

    router.push(`/patients/${patientId}/medicines`);
    router.refresh();
  }

  return (
    <form className="patient-form" onSubmit={handleSubmit}>
      {errors.form ? <p className="form-error">{errors.form}</p> : null}

      <label>
        Medicine name
        <input name="name" type="text" autoComplete="off" aria-describedby="name-error" />
        {errors.name ? (
          <span className="field-error" id="name-error">
            {errors.name}
          </span>
        ) : null}
      </label>

      <label>
        Dosage
        <input name="dosage" type="text" placeholder="500 mg" />
      </label>

      <label>
        Form
        <input name="form" type="text" placeholder="Tablet, syrup, capsule" />
      </label>

      <label>
        Frequency
        <input name="frequency" type="text" placeholder="Once daily, twice daily" />
      </label>

      <label>
        Food instruction
        <input name="foodInstruction" type="text" placeholder="Before food, after food" />
      </label>

      <div className="form-row">
        <label>
          Start date
          <input name="startDate" type="date" aria-describedby="startDate-error" />
          {errors.startDate ? (
            <span className="field-error" id="startDate-error">
              {errors.startDate}
            </span>
          ) : null}
        </label>

        <label>
          End date
          <input name="endDate" type="date" aria-describedby="endDate-error" />
          {errors.endDate ? (
            <span className="field-error" id="endDate-error">
              {errors.endDate}
            </span>
          ) : null}
        </label>
      </div>

      <fieldset className="timing-fieldset">
        <legend>Timings</legend>
        {timings.map((timing, index) => (
          <div className="timing-row" key={timing.id}>
            <label>
              Label
              <input
                type="text"
                value={timing.label}
                onChange={(event) => updateTiming(timing.id, "label", event.target.value)}
                placeholder="Morning"
              />
            </label>
            <label>
              Time
              <input
                type="time"
                value={timing.timeOfDay}
                onChange={(event) => updateTiming(timing.id, "timeOfDay", event.target.value)}
                aria-describedby="timings-error"
              />
            </label>
            {timings.length > 1 ? (
              <button
                className="secondary-button timing-remove"
                type="button"
                onClick={() => removeTiming(timing.id)}
              >
                Remove
              </button>
            ) : (
              <span className="timing-placeholder" aria-hidden="true" />
            )}
            {index === timings.length - 1 ? (
              <button className="secondary-button timing-add" type="button" onClick={addTiming}>
                Add timing
              </button>
            ) : null}
          </div>
        ))}
        {errors.timings ? (
          <span className="field-error" id="timings-error">
            {errors.timings}
          </span>
        ) : null}
      </fieldset>

      <label>
        Instructions
        <textarea name="instructions" rows={4} placeholder="Care notes for this medicine" />
      </label>

      <button className="primary-button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Add medicine"}
      </button>
    </form>
  );
}
