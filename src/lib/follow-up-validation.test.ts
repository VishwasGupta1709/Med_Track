import { describe, expect, it } from "vitest";
import {
  FOLLOW_UP_STATUS,
  FollowUpInput,
  parseDateTimeInput,
  validateFollowUpInput,
} from "@/lib/follow-up-validation";

function createInput(overrides: Partial<FollowUpInput> = {}): FollowUpInput {
  return {
    appointmentAt: "2026-05-16T10:30",
    ...overrides,
  };
}

describe("follow-up validation", () => {
  it("allows valid minimal follow-up input", () => {
    expect(validateFollowUpInput(createInput())).toEqual({
      isValid: true,
      errors: {},
    });
  });

  it("allows optional follow-up text fields", () => {
    expect(
      validateFollowUpInput(
        createInput({
          doctorName: "Dr. Rao",
          hospitalName: "City Clinic",
          reason: "Routine follow-up",
          notes: "Bring previous records",
        }),
      ),
    ).toEqual({
      isValid: true,
      errors: {},
    });
  });

  it.each(["", "   ", "not-a-date"])(
    "rejects appointmentAt value %j",
    (appointmentAt) => {
      expect(validateFollowUpInput(createInput({ appointmentAt })).errors).toEqual({
        appointmentAt: "Appointment date and time must be a valid date and time.",
      });
    },
  );

  it.each(["2026-05-16T10:30", "2026-05-16T10:30:00.000Z"])(
    "allows valid appointmentAt value %s",
    (appointmentAt) => {
      expect(validateFollowUpInput(createInput({ appointmentAt }))).toEqual({
        isValid: true,
        errors: {},
      });
    },
  );

  it.each([undefined, null, "", FOLLOW_UP_STATUS.UPCOMING])(
    "allows status %s",
    (status) => {
      expect(validateFollowUpInput(createInput({ status }))).toEqual({
        isValid: true,
        errors: {},
      });
    },
  );

  it("rejects unsupported status", () => {
    expect(validateFollowUpInput(createInput({ status: "DONE" }))).toEqual({
      isValid: false,
      errors: {
        status: "Status must be UPCOMING.",
      },
    });
  });

  it("currently allows whitespace-only optional text fields", () => {
    expect(
      validateFollowUpInput(
        createInput({
          doctorName: "   ",
          hospitalName: "   ",
          reason: "   ",
          notes: "   ",
        }),
      ),
    ).toEqual({
      isValid: true,
      errors: {},
    });
  });

  it("returns null when parsing blank or invalid date-time input", () => {
    expect(parseDateTimeInput("")).toBeNull();
    expect(parseDateTimeInput("   ")).toBeNull();
    expect(parseDateTimeInput("not-a-date")).toBeNull();
  });

  it("returns a Date when parsing valid date-time input", () => {
    expect(parseDateTimeInput("2026-05-16T10:30")).toBeInstanceOf(Date);
  });
});
