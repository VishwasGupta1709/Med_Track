const MAX_CONFIRMATION_TEXT_LENGTH = 500;

export type DoseEventActionInput = {
  confirmationNote?: string | null;
  skippedReason?: string | null;
};

function normalizeOptionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function normalizeDoseEventActionBody(body: unknown): DoseEventActionInput {
  const data = body && typeof body === "object" ? (body as Record<string, unknown>) : {};

  return {
    confirmationNote: normalizeOptionalText(data.confirmationNote),
    skippedReason: normalizeOptionalText(data.skippedReason),
  };
}

export function validateDoseEventActionInput(input: DoseEventActionInput) {
  const errors: Record<string, string> = {};

  if (
    input.confirmationNote &&
    input.confirmationNote.length > MAX_CONFIRMATION_TEXT_LENGTH
  ) {
    errors.confirmationNote = "Confirmation note must be 500 characters or less.";
  }

  if (input.skippedReason && input.skippedReason.length > MAX_CONFIRMATION_TEXT_LENGTH) {
    errors.skippedReason = "Skipped reason must be 500 characters or less.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
