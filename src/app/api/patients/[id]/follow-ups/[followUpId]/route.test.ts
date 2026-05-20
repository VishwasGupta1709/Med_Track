import { afterEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => ({
  patientFindFirst: vi.fn(),
  followUpFindFirst: vi.fn(),
  followUpUpdate: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    patient: {
      findFirst: prismaMocks.patientFindFirst,
    },
    followUp: {
      findFirst: prismaMocks.followUpFindFirst,
      update: prismaMocks.followUpUpdate,
    },
  },
}));

import { FOLLOW_UP_STATUS } from "@/lib/follow-up-validation";
import { PATCH } from "./route";

function createPayload(overrides: Record<string, unknown> = {}) {
  return {
    appointmentAt: "2026-05-16T10:30",
    doctorName: "Dr. Rao",
    hospitalName: "City Clinic",
    reason: "Routine follow-up",
    notes: "Bring previous records",
    ...overrides,
  };
}

function createRequest(body: unknown = createPayload()) {
  return new Request("http://localhost/api/patients/patient-1/follow-ups/follow-up-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createContext(followUpId = "follow-up-1") {
  return {
    params: Promise.resolve({ id: "patient-1", followUpId }),
  };
}

describe("edit follow-up route", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 when the patient is missing or not owned", async () => {
    prismaMocks.patientFindFirst.mockResolvedValueOnce(null);

    const response = await PATCH(createRequest(), createContext());

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Patient not found." });
    expect(prismaMocks.patientFindFirst).toHaveBeenCalledWith({
      where: {
        id: "patient-1",
        createdByUserId: "demo-user",
      },
      select: { id: true },
    });
    expect(prismaMocks.followUpFindFirst).not.toHaveBeenCalled();
    expect(prismaMocks.followUpUpdate).not.toHaveBeenCalled();
  });

  it("returns 404 when the follow-up is missing or belongs to another patient", async () => {
    prismaMocks.patientFindFirst.mockResolvedValueOnce({ id: "patient-1" });
    prismaMocks.followUpFindFirst.mockResolvedValueOnce(null);

    const response = await PATCH(createRequest(), createContext());

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Follow-up not found." });
    expect(prismaMocks.followUpFindFirst).toHaveBeenCalledWith({
      where: {
        id: "follow-up-1",
        patientId: "patient-1",
      },
      select: { id: true },
    });
    expect(prismaMocks.followUpUpdate).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid appointmentAt", async () => {
    prismaMocks.patientFindFirst.mockResolvedValueOnce({ id: "patient-1" });
    prismaMocks.followUpFindFirst.mockResolvedValueOnce({ id: "follow-up-1" });

    const response = await PATCH(
      createRequest(createPayload({ appointmentAt: "not-a-date" })),
      createContext(),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      errors: {
        appointmentAt: "Appointment date and time must be a valid date and time.",
      },
    });
    expect(prismaMocks.followUpUpdate).not.toHaveBeenCalled();
  });

  it("updates valid editable fields", async () => {
    const updatedFollowUp = {
      id: "follow-up-1",
      patientId: "patient-1",
      appointmentAt: new Date("2026-05-16T10:45:00.000Z"),
      doctorName: "Dr. Mehta",
      hospitalName: "City Hospital",
      reason: "Updated note",
      notes: "Bring reports",
      status: FOLLOW_UP_STATUS.UPCOMING,
    };

    prismaMocks.patientFindFirst.mockResolvedValueOnce({ id: "patient-1" });
    prismaMocks.followUpFindFirst.mockResolvedValueOnce({ id: "follow-up-1" });
    prismaMocks.followUpUpdate.mockResolvedValueOnce(updatedFollowUp);

    const response = await PATCH(
      createRequest(
        createPayload({
          appointmentAt: "2026-05-16T10:45",
          doctorName: "Dr. Mehta",
          hospitalName: "City Hospital",
          reason: "Updated note",
          notes: "Bring reports",
        }),
      ),
      createContext(),
    );

    expect(response.status).toBe(200);
    expect(prismaMocks.followUpUpdate).toHaveBeenCalledWith({
      where: { id: "follow-up-1" },
      data: {
        appointmentAt: new Date("2026-05-16T10:45"),
        doctorName: "Dr. Mehta",
        hospitalName: "City Hospital",
        reason: "Updated note",
        notes: "Bring reports",
      },
    });
    expect(await response.json()).toEqual({
      ...updatedFollowUp,
      appointmentAt: updatedFollowUp.appointmentAt.toISOString(),
    });
  });

  it("uses the route patient id and follow-up id in ownership and update checks", async () => {
    prismaMocks.patientFindFirst.mockResolvedValueOnce({ id: "patient-1" });
    prismaMocks.followUpFindFirst.mockResolvedValueOnce({ id: "follow-up-2" });
    prismaMocks.followUpUpdate.mockResolvedValueOnce({
      id: "follow-up-2",
      patientId: "patient-1",
      appointmentAt: new Date("2026-05-16T10:30:00.000Z"),
      doctorName: null,
      hospitalName: null,
      reason: null,
      notes: null,
      status: FOLLOW_UP_STATUS.UPCOMING,
    });

    await PATCH(createRequest(), createContext("follow-up-2"));

    expect(prismaMocks.followUpFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "follow-up-2",
          patientId: "patient-1",
        },
      }),
    );
    expect(prismaMocks.followUpUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "follow-up-2" },
      }),
    );
  });

  it("trims values and allows optional fields to be cleared", async () => {
    const updatedFollowUp = {
      id: "follow-up-1",
      patientId: "patient-1",
      appointmentAt: new Date("2026-05-16T10:30:00.000Z"),
      doctorName: null,
      hospitalName: null,
      reason: null,
      notes: null,
      status: FOLLOW_UP_STATUS.UPCOMING,
    };

    prismaMocks.patientFindFirst.mockResolvedValueOnce({ id: "patient-1" });
    prismaMocks.followUpFindFirst.mockResolvedValueOnce({ id: "follow-up-1" });
    prismaMocks.followUpUpdate.mockResolvedValueOnce(updatedFollowUp);

    const response = await PATCH(
      createRequest({
        appointmentAt: " 2026-05-16T10:30 ",
        doctorName: "   ",
        hospitalName: "",
        reason: null,
        notes: undefined,
      }),
      createContext(),
    );

    expect(response.status).toBe(200);
    expect(prismaMocks.followUpUpdate).toHaveBeenCalledWith({
      where: { id: "follow-up-1" },
      data: {
        appointmentAt: new Date("2026-05-16T10:30"),
        doctorName: null,
        hospitalName: null,
        reason: null,
        notes: null,
      },
    });
  });

  it("rejects unsupported status if sent", async () => {
    prismaMocks.patientFindFirst.mockResolvedValueOnce({ id: "patient-1" });
    prismaMocks.followUpFindFirst.mockResolvedValueOnce({ id: "follow-up-1" });

    const response = await PATCH(
      createRequest(createPayload({ status: "DONE" })),
      createContext(),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      errors: {
        status: "Status must be UPCOMING.",
      },
    });
    expect(prismaMocks.followUpUpdate).not.toHaveBeenCalled();
  });
});
