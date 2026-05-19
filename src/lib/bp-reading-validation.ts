export type BPReadingInput = {
  systolic: number | null;
  diastolic: number | null;
  pulse?: number | null;
  measuredAt: string;
  notes?: string | null;
};

function isPositiveInteger(value: number | null | undefined) {
  return Number.isInteger(value) && Number(value) > 0;
}

function isWithinRange(value: number, max: number) {
  return value <= max;
}

export function parseDateTimeInput(value: string) {
  if (!value.trim()) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function validateBPReadingInput(input: BPReadingInput) {
  const errors: Record<string, string> = {};

  if (input.systolic === null) {
    errors.systolic = "Systolic reading is required.";
  } else if (!isPositiveInteger(input.systolic)) {
    errors.systolic = "Systolic reading must be a positive whole number.";
  } else if (!isWithinRange(input.systolic, 300)) {
    errors.systolic = "Systolic reading must be between 1 and 300.";
  }

  if (input.diastolic === null) {
    errors.diastolic = "Diastolic reading is required.";
  } else if (!isPositiveInteger(input.diastolic)) {
    errors.diastolic = "Diastolic reading must be a positive whole number.";
  } else if (!isWithinRange(input.diastolic, 200)) {
    errors.diastolic = "Diastolic reading must be between 1 and 200.";
  }

  if (input.pulse !== null && input.pulse !== undefined) {
    if (!isPositiveInteger(input.pulse)) {
      errors.pulse = "Pulse must be a positive whole number.";
    } else if (!isWithinRange(input.pulse, 250)) {
      errors.pulse = "Pulse must be between 1 and 250.";
    }
  }

  if (!parseDateTimeInput(input.measuredAt)) {
    errors.measuredAt = "Measured at must be a valid date and time.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
