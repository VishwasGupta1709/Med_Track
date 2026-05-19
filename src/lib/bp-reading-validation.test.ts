import { describe, expect, it } from "vitest";
import type { BPReadingInput } from "@/lib/bp-reading-validation";
import {
  parseDateTimeInput,
  validateBPReadingInput,
} from "@/lib/bp-reading-validation";

function createInput(overrides: Partial<BPReadingInput> = {}): BPReadingInput {
  return {
    systolic: 120,
    diastolic: 80,
    measuredAt: "2026-05-16T10:30",
    ...overrides,
  };
}

describe("BP reading validation", () => {
  it("allows valid minimal BP reading input", () => {
    expect(validateBPReadingInput(createInput())).toEqual({
      isValid: true,
      errors: {},
    });
  });

  it("allows omitted pulse", () => {
    expect(validateBPReadingInput(createInput())).toEqual({
      isValid: true,
      errors: {},
    });
  });

  it.each([undefined, null])("allows pulse %s", (pulse) => {
    expect(validateBPReadingInput(createInput({ pulse }))).toEqual({
      isValid: true,
      errors: {},
    });
  });

  it("allows notes without validating them", () => {
    expect(validateBPReadingInput(createInput({ notes: "Care note" }))).toEqual({
      isValid: true,
      errors: {},
    });
  });

  it("requires systolic reading", () => {
    expect(validateBPReadingInput(createInput({ systolic: null }))).toEqual({
      isValid: false,
      errors: {
        systolic: "Systolic reading is required.",
      },
    });
  });

  it("requires diastolic reading", () => {
    expect(validateBPReadingInput(createInput({ diastolic: null }))).toEqual({
      isValid: false,
      errors: {
        diastolic: "Diastolic reading is required.",
      },
    });
  });

  it.each([0, -1, 120.5, Number.NaN])("rejects invalid systolic value %s", (systolic) => {
    expect(validateBPReadingInput(createInput({ systolic })).errors).toEqual({
      systolic: "Systolic reading must be a positive whole number.",
    });
  });

  it.each([0, -1, 80.5, Number.NaN])("rejects invalid diastolic value %s", (diastolic) => {
    expect(validateBPReadingInput(createInput({ diastolic })).errors).toEqual({
      diastolic: "Diastolic reading must be a positive whole number.",
    });
  });

  it.each([0, -1, 72.5, Number.NaN])("rejects invalid pulse value %s", (pulse) => {
    expect(validateBPReadingInput(createInput({ pulse })).errors).toEqual({
      pulse: "Pulse must be a positive whole number.",
    });
  });

  it("allows broad boundary values", () => {
    expect(validateBPReadingInput(createInput({ systolic: 300, diastolic: 200, pulse: 250 }))).toEqual({
      isValid: true,
      errors: {},
    });
  });

  it("rejects systolic values above 300", () => {
    expect(validateBPReadingInput(createInput({ systolic: 301 })).errors).toEqual({
      systolic: "Systolic reading must be between 1 and 300.",
    });
  });

  it("rejects diastolic values above 200", () => {
    expect(validateBPReadingInput(createInput({ diastolic: 201 })).errors).toEqual({
      diastolic: "Diastolic reading must be between 1 and 200.",
    });
  });

  it("rejects pulse values above 250", () => {
    expect(validateBPReadingInput(createInput({ pulse: 251 })).errors).toEqual({
      pulse: "Pulse must be between 1 and 250.",
    });
  });

  it("rejects blank measuredAt", () => {
    expect(validateBPReadingInput(createInput({ measuredAt: "" })).errors).toEqual({
      measuredAt: "Measured at must be a valid date and time.",
    });
  });

  it("rejects whitespace-only measuredAt", () => {
    expect(validateBPReadingInput(createInput({ measuredAt: "   " })).errors).toEqual({
      measuredAt: "Measured at must be a valid date and time.",
    });
  });

  it("rejects invalid measuredAt", () => {
    expect(validateBPReadingInput(createInput({ measuredAt: "not-a-date" })).errors).toEqual({
      measuredAt: "Measured at must be a valid date and time.",
    });
  });

  it.each(["2026-05-16T10:30", "2026-05-16T10:30:00.000Z"])(
    "allows valid measuredAt value %s",
    (measuredAt) => {
      expect(validateBPReadingInput(createInput({ measuredAt }))).toEqual({
        isValid: true,
        errors: {},
      });
    },
  );

  it("returns null when parsing blank or invalid date-time input", () => {
    expect(parseDateTimeInput("")).toBeNull();
    expect(parseDateTimeInput("   ")).toBeNull();
    expect(parseDateTimeInput("not-a-date")).toBeNull();
  });

  it("returns a Date when parsing valid date-time input", () => {
    expect(parseDateTimeInput("2026-05-16T10:30")).toBeInstanceOf(Date);
  });
});
