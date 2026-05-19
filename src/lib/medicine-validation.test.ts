import { describe, expect, it } from "vitest";
import type { MedicineInput } from "@/lib/medicine-validation";
import { validateMedicineInput } from "@/lib/medicine-validation";

function createInput(overrides: Partial<MedicineInput> = {}): MedicineInput {
  return {
    name: "Paracetamol",
    startDate: "2026-05-16",
    timings: [{ timeOfDay: "09:00" }],
    ...overrides,
  };
}

describe("medicine validation", () => {
  it("allows valid minimal medicine input", () => {
    expect(validateMedicineInput(createInput())).toEqual({
      isValid: true,
      errors: {},
    });
  });

  it("requires a medicine name", () => {
    expect(validateMedicineInput(createInput({ name: "" }))).toEqual({
      isValid: false,
      errors: {
        name: "Medicine name is required.",
      },
    });
  });

  it("rejects a whitespace-only medicine name", () => {
    expect(validateMedicineInput(createInput({ name: "   " })).errors).toEqual({
      name: "Medicine name is required.",
    });
  });

  it("allows a padded non-empty medicine name without normalizing the input", () => {
    const input = createInput({ name: "  Paracetamol  " });

    expect(validateMedicineInput(input)).toEqual({
      isValid: true,
      errors: {},
    });
    expect(input.name).toBe("  Paracetamol  ");
  });

  it("allows optional descriptive medicine fields", () => {
    expect(
      validateMedicineInput(
        createInput({
          dosage: "500 mg",
          form: "Tablet",
          frequency: "Once daily",
          foodInstruction: "After food",
          instructions: "Caregiver note",
        }),
      ),
    ).toEqual({
      isValid: true,
      errors: {},
    });
  });

  it("allows once daily with exactly 1 timing", () => {
    expect(validateMedicineInput(createInput({ frequency: "Once daily" }))).toEqual({
      isValid: true,
      errors: {},
    });
  });

  it("rejects 2 times daily with 1 timing", () => {
    expect(validateMedicineInput(createInput({ frequency: "2" }))).toEqual({
      isValid: false,
      errors: {
        timings: "Frequency is 2 times daily, so please add exactly 2 timings.",
      },
    });
  });

  it("allows 2 times daily with exactly 2 timings", () => {
    expect(
      validateMedicineInput(
        createInput({
          frequency: "2",
          timings: [{ timeOfDay: "09:00" }, { timeOfDay: "21:00" }],
        }),
      ),
    ).toEqual({
      isValid: true,
      errors: {},
    });
  });

  it("rejects 3 times daily with 2 timings", () => {
    expect(
      validateMedicineInput(
        createInput({
          frequency: "3 times daily",
          timings: [{ timeOfDay: "09:00" }, { timeOfDay: "21:00" }],
        }),
      ),
    ).toEqual({
      isValid: false,
      errors: {
        timings: "Frequency is 3 times daily, so please add exactly 3 timings.",
      },
    });
  });

  it("allows 3 times daily with exactly 3 timings", () => {
    expect(
      validateMedicineInput(
        createInput({
          frequency: "3 times daily",
          timings: [
            { timeOfDay: "09:00" },
            { timeOfDay: "15:00" },
            { timeOfDay: "21:00" },
          ],
        }),
      ),
    ).toEqual({
      isValid: true,
      errors: {},
    });
  });

  it("rejects 4 times daily with 5 timings", () => {
    expect(
      validateMedicineInput(
        createInput({
          frequency: "4 times daily",
          timings: [
            { timeOfDay: "06:00" },
            { timeOfDay: "10:00" },
            { timeOfDay: "14:00" },
            { timeOfDay: "18:00" },
            { timeOfDay: "22:00" },
          ],
        }),
      ),
    ).toEqual({
      isValid: false,
      errors: {
        timings: "Frequency is 4 times daily, so please add exactly 4 timings.",
      },
    });
  });

  it("requires at least one timing", () => {
    expect(validateMedicineInput(createInput({ timings: [] }))).toEqual({
      isValid: false,
      errors: {
        timings: "At least one timing is required.",
      },
    });
  });

  it.each(["00:00", "09:30", "23:59"])("allows valid HH:mm timing %s", (timeOfDay) => {
    expect(validateMedicineInput(createInput({ timings: [{ timeOfDay }] }))).toEqual({
      isValid: true,
      errors: {},
    });
  });

  it.each(["24:00", "9:00", "12:60", "morning"])(
    "rejects invalid timing %s",
    (timeOfDay) => {
      expect(validateMedicineInput(createInput({ timings: [{ timeOfDay }] })).errors).toEqual({
        timings: "Each timing must use HH:mm format.",
      });
    },
  );

  it.each(["", "   "])("requires a start date for %j", (startDate) => {
    expect(validateMedicineInput(createInput({ startDate }))).toEqual({
      isValid: false,
      errors: {
        startDate: "Start date is required.",
      },
    });
  });

  it("rejects an invalid end date", () => {
    expect(validateMedicineInput(createInput({ endDate: "not-a-date" }))).toEqual({
      isValid: false,
      errors: {
        endDate: "End date must be a valid date.",
      },
    });
  });

  it("rejects an end date before the start date", () => {
    expect(
      validateMedicineInput(
        createInput({
          startDate: "2026-05-16",
          endDate: "2026-05-15",
        }),
      ),
    ).toEqual({
      isValid: false,
      errors: {
        endDate: "End date cannot be before start date.",
      },
    });
  });

  it("allows an end date equal to the start date", () => {
    expect(
      validateMedicineInput(
        createInput({
          startDate: "2026-05-16",
          endDate: "2026-05-16",
        }),
      ),
    ).toEqual({
      isValid: true,
      errors: {},
    });
  });

  it("currently ignores unsupported status values", () => {
    expect(validateMedicineInput(createInput({ status: "UNSUPPORTED" }))).toEqual({
      isValid: true,
      errors: {},
    });
  });
});
