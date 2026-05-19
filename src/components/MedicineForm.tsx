"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { validateMedicineInput } from "@/lib/medicine-validation";

type FormErrors = Partial<
  Record<"name" | "startDate" | "endDate" | "timings" | "form", string>
>;

type TimingRow = {
  id: number;
  persistedId?: string;
  label: string;
  timeOfDay: string;
};

type MedicineFormInitialValue = {
  id: string;
  name: string;
  dosage?: string | null;
  form?: string | null;
  frequency?: string | null;
  foodInstruction?: string | null;
  instructions?: string | null;
  startDate: string;
  endDate?: string | null;
  timings: {
    id: string;
    label?: string | null;
    timeOfDay: string;
  }[];
};

type MedicineFormProps = {
  patientId: string;
} & (
  | {
      mode?: "create";
      medicine?: never;
    }
  | {
      mode: "edit";
      medicine: MedicineFormInitialValue;
    }
);

const emptyTiming = (id: number): TimingRow => ({
  id,
  label: "",
  timeOfDay: "",
});

function createInitialTimings(medicine?: MedicineFormInitialValue) {
  if (!medicine) {
    return [emptyTiming(1)];
  }

  if (medicine.timings.length === 0) {
    return [emptyTiming(1)];
  }

  return medicine.timings.map((timing, index) => ({
    id: index + 1,
    persistedId: timing.id,
    label: timing.label || "",
    timeOfDay: timing.timeOfDay,
  }));
}

export function MedicineForm(props: MedicineFormProps) {
  const { patientId } = props;
  const router = useRouter();
  const isEditMode = props.mode === "edit";
  const medicine = isEditMode ? props.medicine : undefined;
  const initialTimings = createInitialTimings(medicine);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timings, setTimings] = useState<TimingRow[]>(initialTimings);
  const [nextTimingId, setNextTimingId] = useState(initialTimings.length + 1);

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
        id: timing.persistedId,
        label: timing.label,
        timeOfDay: timing.timeOfDay,
      })),
    };

    const validation = validateMedicineInput(payload);

    if (!validation.isValid) {
      setErrors(validation.errors);
      setIsSubmitting(false);
      return;
    }

    try {
      const requestUrl =
        props.mode === "edit"
          ? `/api/patients/${patientId}/medicines/${props.medicine.id}`
          : `/api/patients/${patientId}/medicines`;
      const requestMethod = props.mode === "edit" ? "PATCH" : "POST";

      const response = await fetch(requestUrl, {
        method: requestMethod,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string; errors?: FormErrors }
          | null;
        setErrors(
          body?.errors || {
            form:
              body?.error ||
              (isEditMode ? "Unable to update medicine." : "Unable to create medicine."),
          },
        );
        setIsSubmitting(false);
        return;
      }
    } catch {
      setErrors({ form: "Network error. Please try again." });
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
        <input
          name="name"
          type="text"
          autoComplete="off"
          aria-describedby="name-error"
          defaultValue={medicine?.name || ""}
        />
        {errors.name ? (
          <span className="field-error" id="name-error">
            {errors.name}
          </span>
        ) : null}
      </label>

      <label>
        Dosage
        <input name="dosage" type="text" placeholder="500 mg" defaultValue={medicine?.dosage || ""} />
      </label>

      <label>
        Form
        <input
          name="form"
          type="text"
          placeholder="Tablet, syrup, capsule"
          defaultValue={medicine?.form || ""}
        />
      </label>

      <label>
        Frequency
        <input
          name="frequency"
          type="text"
          placeholder="Once daily, twice daily"
          defaultValue={medicine?.frequency || ""}
        />
      </label>

      <label>
        Food instruction
        <input
          name="foodInstruction"
          type="text"
          placeholder="Before food, after food"
          defaultValue={medicine?.foodInstruction || ""}
        />
      </label>

      <div className="form-row">
        <label>
          Start date
          <input
            name="startDate"
            type="date"
            aria-describedby="startDate-error"
            defaultValue={medicine?.startDate || ""}
          />
          {errors.startDate ? (
            <span className="field-error" id="startDate-error">
              {errors.startDate}
            </span>
          ) : null}
        </label>

        <label>
          End date
          <input
            name="endDate"
            type="date"
            aria-describedby="endDate-error"
            defaultValue={medicine?.endDate || ""}
          />
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
            {timings.length > 1 && (!isEditMode || !timing.persistedId) ? (
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
        <textarea
          name="instructions"
          rows={4}
          placeholder="Care notes for this medicine"
          defaultValue={medicine?.instructions || ""}
        />
      </label>

      <button className="primary-button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : isEditMode ? "Save medicine" : "Add medicine"}
      </button>
    </form>
  );
}
