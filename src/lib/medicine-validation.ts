export type MedicineTimingInput = {
  label?: string | null;
  timeOfDay: string;
};

export type MedicineInput = {
  name: string;
  dosage?: string | null;
  form?: string | null;
  frequency?: string | null;
  foodInstruction?: string | null;
  instructions?: string | null;
  status?: string | null;
  startDate: string;
  endDate?: string | null;
  timings: MedicineTimingInput[];
};

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function validateMedicineInput(input: MedicineInput) {
  const errors: Record<string, string> = {};

  if (!input.name.trim()) {
    errors.name = "Medicine name is required.";
  }

  const startDate = parseDateInput(input.startDate);
  const endDate = input.endDate ? parseDateInput(input.endDate) : null;

  if (!startDate) {
    errors.startDate = "Start date is required.";
  }

  if (input.endDate && !endDate) {
    errors.endDate = "End date must be a valid date.";
  }

  if (startDate && endDate && endDate < startDate) {
    errors.endDate = "End date cannot be before start date.";
  }

  if (input.timings.length === 0) {
    errors.timings = "At least one timing is required.";
  }

  if (input.timings.some((timing) => !TIME_PATTERN.test(timing.timeOfDay))) {
    errors.timings = "Each timing must use HH:mm format.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function parseDateInput(value: string) {
  if (!value.trim()) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}
