export const FOLLOW_UP_STATUS = {
  UPCOMING: "UPCOMING",
} as const;

export type FollowUpInput = {
  appointmentAt: string;
  doctorName?: string | null;
  hospitalName?: string | null;
  reason?: string | null;
  notes?: string | null;
  status?: string | null;
};

export function parseDateTimeInput(value: string) {
  if (!value.trim()) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function validateFollowUpInput(input: FollowUpInput) {
  const errors: Record<string, string> = {};

  if (!parseDateTimeInput(input.appointmentAt)) {
    errors.appointmentAt = "Appointment date and time must be a valid date and time.";
  }

  if (input.status && input.status !== FOLLOW_UP_STATUS.UPCOMING) {
    errors.status = "Status must be UPCOMING.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
