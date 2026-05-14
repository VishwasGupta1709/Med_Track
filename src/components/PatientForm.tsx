"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type FormErrors = Partial<Record<"fullName" | "age" | "form", string>>;

export function PatientForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      fullName: String(formData.get("fullName") || ""),
      age: String(formData.get("age") || ""),
      relationship: String(formData.get("relationship") || ""),
      phoneNumber: String(formData.get("phoneNumber") || ""),
      notes: String(formData.get("notes") || ""),
    };

    if (!payload.fullName.trim()) {
      setErrors({ fullName: "Full name is required." });
      setIsSubmitting(false);
      return;
    }

    if (payload.age && Number(payload.age) < 0) {
      setErrors({ age: "Age cannot be negative." });
      setIsSubmitting(false);
      return;
    }

    const response = await fetch("/api/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { errors?: FormErrors } | null;
      setErrors(body?.errors || { form: "Unable to create patient." });
      setIsSubmitting(false);
      return;
    }

    const patient = (await response.json()) as { id: string };
    router.push(`/patients/${patient.id}`);
    router.refresh();
  }

  return (
    <form className="patient-form" onSubmit={handleSubmit}>
      {errors.form ? <p className="form-error">{errors.form}</p> : null}

      <label>
        Full name
        <input name="fullName" type="text" autoComplete="name" aria-describedby="fullName-error" />
        {errors.fullName ? (
          <span className="field-error" id="fullName-error">
            {errors.fullName}
          </span>
        ) : null}
      </label>

      <label>
        Age
        <input name="age" type="number" min="0" inputMode="numeric" aria-describedby="age-error" />
        {errors.age ? (
          <span className="field-error" id="age-error">
            {errors.age}
          </span>
        ) : null}
      </label>

      <label>
        Relationship
        <input name="relationship" type="text" placeholder="Mother, father, spouse" />
      </label>

      <label>
        Phone number
        <input name="phoneNumber" type="tel" autoComplete="tel" />
      </label>

      <label>
        Notes
        <textarea name="notes" rows={4} placeholder="Care notes or context" />
      </label>

      <button className="primary-button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Create patient"}
      </button>
    </form>
  );
}
