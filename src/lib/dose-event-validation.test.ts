import { describe, expect, it } from "vitest";
import {
  normalizeDoseEventActionBody,
  validateDoseEventActionInput,
} from "@/lib/dose-event-validation";

describe("dose event validation", () => {
  it("allows empty note and reason values", () => {
    const input = normalizeDoseEventActionBody({
      confirmationNote: "",
      skippedReason: "",
    });

    expect(input).toEqual({
      confirmationNote: null,
      skippedReason: null,
    });
    expect(validateDoseEventActionInput(input)).toEqual({
      isValid: true,
      errors: {},
    });
  });

  it("converts whitespace-only note and reason values to null", () => {
    expect(
      normalizeDoseEventActionBody({
        confirmationNote: "   ",
        skippedReason: "\t\n",
      }),
    ).toEqual({
      confirmationNote: null,
      skippedReason: null,
    });
  });

  it("trims note and reason values", () => {
    expect(
      normalizeDoseEventActionBody({
        confirmationNote: "  Taken after breakfast  ",
        skippedReason: "  Caregiver skipped  ",
      }),
    ).toEqual({
      confirmationNote: "Taken after breakfast",
      skippedReason: "Caregiver skipped",
    });
  });

  it("allows 500-character note and reason values", () => {
    const text = "a".repeat(500);

    expect(
      validateDoseEventActionInput({
        confirmationNote: text,
        skippedReason: text,
      }),
    ).toEqual({
      isValid: true,
      errors: {},
    });
  });

  it("rejects note and reason values longer than 500 characters", () => {
    const text = "a".repeat(501);

    expect(
      validateDoseEventActionInput({
        confirmationNote: text,
        skippedReason: text,
      }),
    ).toEqual({
      isValid: false,
      errors: {
        confirmationNote: "Confirmation note must be 500 characters or less.",
        skippedReason: "Skipped reason must be 500 characters or less.",
      },
    });
  });

  it("normalizes invalid payload shapes to empty optional values", () => {
    expect(normalizeDoseEventActionBody(null)).toEqual({
      confirmationNote: null,
      skippedReason: null,
    });
    expect(normalizeDoseEventActionBody("invalid")).toEqual({
      confirmationNote: null,
      skippedReason: null,
    });
    expect(
      normalizeDoseEventActionBody({
        confirmationNote: 123,
        skippedReason: false,
      }),
    ).toEqual({
      confirmationNote: null,
      skippedReason: null,
    });
  });
});
