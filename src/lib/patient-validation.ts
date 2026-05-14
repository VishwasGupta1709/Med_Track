export type PatientInput = {
  fullName: string;
  age?: number | null;
  relationship?: string | null;
  phoneNumber?: string | null;
  notes?: string | null;
};

export function validatePatientInput(input: PatientInput) {
  const errors: Record<string, string> = {};

  if (!input.fullName.trim()) {
    errors.fullName = "Full name is required.";
  }

  if (input.age !== null && input.age !== undefined && input.age < 0) {
    errors.age = "Age cannot be negative.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
