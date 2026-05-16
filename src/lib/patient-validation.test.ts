import { describe, expect, it } from "vitest";
import type { PatientInput } from "@/lib/patient-validation";
import { validatePatientInput } from "@/lib/patient-validation";

function createInput(overrides: Partial<PatientInput> = {}): PatientInput {
  return {
    fullName: "Asha Rao",
    ...overrides,
  };
}

describe("patient validation", () => {
  it("allows valid minimal patient input", () => {
    expect(validatePatientInput(createInput())).toEqual({
      isValid: true,
      errors: {},
    });
  });

  it("requires a full name", () => {
    expect(validatePatientInput(createInput({ fullName: "" }))).toEqual({
      isValid: false,
      errors: {
        fullName: "Full name is required.",
      },
    });
  });

  it("rejects a whitespace-only full name", () => {
    expect(validatePatientInput(createInput({ fullName: "   " })).errors).toEqual({
      fullName: "Full name is required.",
    });
  });

  it("allows a padded non-empty full name without normalizing the input", () => {
    const input = createInput({ fullName: "  Asha Rao  " });

    expect(validatePatientInput(input)).toEqual({
      isValid: true,
      errors: {},
    });
    expect(input.fullName).toBe("  Asha Rao  ");
  });

  it("allows an omitted age", () => {
    expect(validatePatientInput(createInput())).toEqual({
      isValid: true,
      errors: {},
    });
  });

  it.each([null, 0, 42])("allows age %s", (age) => {
    expect(validatePatientInput(createInput({ age }))).toEqual({
      isValid: true,
      errors: {},
    });
  });

  it("rejects a negative age", () => {
    expect(validatePatientInput(createInput({ age: -1 }))).toEqual({
      isValid: false,
      errors: {
        age: "Age cannot be negative.",
      },
    });
  });

  it("allows optional relationship, phone number, and notes", () => {
    expect(
      validatePatientInput(
        createInput({
          relationship: "Mother",
          phoneNumber: "5551234567",
          notes: "Care notes",
        }),
      ),
    ).toEqual({
      isValid: true,
      errors: {},
    });
  });

  it("currently allows NaN age", () => {
    expect(validatePatientInput(createInput({ age: Number.NaN }))).toEqual({
      isValid: true,
      errors: {},
    });
  });

  it("currently allows non-integer age", () => {
    expect(validatePatientInput(createInput({ age: 42.5 }))).toEqual({
      isValid: true,
      errors: {},
    });
  });
});
