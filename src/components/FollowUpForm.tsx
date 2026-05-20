"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type FormErrors = Partial<
  Record<"appointmentAt" | "doctorName" | "hospitalName" | "reason" | "notes" | "status" | "form", string>
>;

type FollowUpFormProps = {
  patientId: string;
} & (
  | {
      mode?: "create";
      followUp?: never;
    }
  | {
      mode: "edit";
      followUp: {
        id: string;
        appointmentAt: string;
        doctorName?: string | null;
        hospitalName?: string | null;
        reason?: string | null;
        notes?: string | null;
      };
    }
);

export function FollowUpForm(props: FollowUpFormProps) {
  const { patientId } = props;
  const isEditMode = props.mode === "edit";
  const followUp = isEditMode ? props.followUp : undefined;
  const router = useRouter();
  const [appointmentAt, setAppointmentAt] = useState(followUp?.appointmentAt || "");
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
      const requestUrl = props.mode === "edit"
        ? `/api/patients/${patientId}/follow-ups/${props.followUp.id}`
        : `/api/patients/${patientId}/follow-ups`;
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
            form: isEditMode ? "Unable to update follow-up." : "Unable to create follow-up.",
          },
        );
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
      <p className="form-helper">
        Enter appointment details exactly as shared by the doctor or hospital. MedTrack stores the
        follow-up without interpreting it.
      </p>

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
          <input
            name="doctorName"
            type="text"
            aria-describedby="doctorName-error"
            defaultValue={followUp?.doctorName || ""}
          />
          {errors.doctorName ? (
            <span className="field-error" id="doctorName-error">
              {errors.doctorName}
            </span>
          ) : null}
        </label>

        <label>
          Hospital name
          <input
            name="hospitalName"
            type="text"
            aria-describedby="hospitalName-error"
            defaultValue={followUp?.hospitalName || ""}
          />
          {errors.hospitalName ? (
            <span className="field-error" id="hospitalName-error">
              {errors.hospitalName}
            </span>
          ) : null}
        </label>
      </div>

      <label>
        Reason
        <input
          name="reason"
          type="text"
          aria-describedby="reason-error"
          defaultValue={followUp?.reason || ""}
        />
        {errors.reason ? (
          <span className="field-error" id="reason-error">
            {errors.reason}
          </span>
        ) : null}
      </label>

      <label>
        Notes
        <textarea
          name="notes"
          rows={4}
          placeholder="Optional notes for this follow-up"
          defaultValue={followUp?.notes || ""}
        />
        {errors.notes ? (
          <span className="field-error" id="notes-error">
            {errors.notes}
          </span>
        ) : null}
      </label>

      {errors.status ? <p className="form-error">{errors.status}</p> : null}

      <button className="primary-button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : isEditMode ? "Save follow-up" : "Add follow-up"}
      </button>
    </form>
  );
}
