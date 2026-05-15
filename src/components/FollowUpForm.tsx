"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type FormErrors = Partial<
  Record<"appointmentAt" | "doctorName" | "hospitalName" | "reason" | "notes" | "status" | "form", string>
>;

type FollowUpFormProps = {
  patientId: string;
};

export function FollowUpForm({ patientId }: FollowUpFormProps) {
  const router = useRouter();
  const [appointmentAt, setAppointmentAt] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});

    if (!appointmentAt.trim()) {
      setErrors({ appointmentAt: "Appointment date and time is required." });
      return;
    }

    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      appointmentAt,
      doctorName: String(formData.get("doctorName") || ""),
      hospitalName: String(formData.get("hospitalName") || ""),
      reason: String(formData.get("reason") || ""),
      notes: String(formData.get("notes") || ""),
    };

    try {
      const response = await fetch(`/api/patients/${patientId}/follow-ups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { errors?: FormErrors } | null;
        setErrors(body?.errors || { form: "Unable to create follow-up." });
        return;
      }

      router.push(`/patients/${patientId}/follow-ups`);
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

      <label>
        Appointment date and time
        <input
          name="appointmentAt"
          type="datetime-local"
          value={appointmentAt}
          onChange={(event) => setAppointmentAt(event.target.value)}
          aria-describedby="appointmentAt-error"
          required
        />
        {errors.appointmentAt ? (
          <span className="field-error" id="appointmentAt-error">
            {errors.appointmentAt}
          </span>
        ) : null}
      </label>

      <div className="form-row">
        <label>
          Doctor name
          <input name="doctorName" type="text" aria-describedby="doctorName-error" />
          {errors.doctorName ? (
            <span className="field-error" id="doctorName-error">
              {errors.doctorName}
            </span>
          ) : null}
        </label>

        <label>
          Hospital name
          <input name="hospitalName" type="text" aria-describedby="hospitalName-error" />
          {errors.hospitalName ? (
            <span className="field-error" id="hospitalName-error">
              {errors.hospitalName}
            </span>
          ) : null}
        </label>
      </div>

      <label>
        Reason
        <input name="reason" type="text" aria-describedby="reason-error" />
        {errors.reason ? (
          <span className="field-error" id="reason-error">
            {errors.reason}
          </span>
        ) : null}
      </label>

      <label>
        Notes
        <textarea name="notes" rows={4} placeholder="Optional notes for this follow-up" />
        {errors.notes ? (
          <span className="field-error" id="notes-error">
            {errors.notes}
          </span>
        ) : null}
      </label>

      {errors.status ? <p className="form-error">{errors.status}</p> : null}

      <button className="primary-button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Add follow-up"}
      </button>
    </form>
  );
}
