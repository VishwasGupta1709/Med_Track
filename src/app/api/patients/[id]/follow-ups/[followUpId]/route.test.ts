import { PatientRole } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => ({
  followUpFindFirst: vi.fn(),
  followUpUpdate: vi.fn(),
}));

const authMocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getPatientMembership: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    followUp: {
      findFirst: prismaMocks.followUpFindFirst,
      update: prismaMocks.followUpUpdate,
    },
  },
}));

vi.mock("@/lib/auth/current-user", () => ({
  getCurrentUser: authMocks.getCurrentUser,
}));

vi.mock("@/lib/auth/patient-access", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/patient-access")>();

  return {
    ...actual,
    getPatientMembership: authMocks.getPatientMembership,
  };
});

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

function mockSignedInUser() {
  authMocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
}

function mockMembership(role: PatientRole) {
  authMocks.getPatientMembership.mockResolvedValue({
    id: "membership-1",
    patientId: "patient-1",
    userId: "user-1",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

describe("edit follow-up route", () => {
  beforeEach(() => {
    mockSignedInUser();
    mockMembership(PatientRole.PRIMARY_CAREGIVER);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when the request is unauthenticated", async () => {
    authMocks.getCurrentUser.mockResolvedValueOnce(null);

    const response = await PATCH(createRequest(), createContext());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Authentication required." });
    expect(prismaMocks.followUpFindFirst).not.toHaveBeenCalled();
    expect(prismaMocks.followUpUpdate).not.toHaveBeenCalled();
  });

  it("returns 404 when the follow-up is missing", async () => {
    prismaMocks.followUpFindFirst.mockResolvedValueOnce(null);

    const response = await PATCH(createRequest(), createContext());

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Follow-up not found." });
    expect(prismaMocks.followUpFindFirst).toHaveBeenCalledWith({
      where: {
        id: "follow-up-1",
        patientId: "patient-1",
      },
      select: { id: true, patientId: true },
    });
    expect(authMocks.getPatientMembership).not.toHaveBeenCalled();
    expect(prismaMocks.followUpUpdate).not.toHaveBeenCalled();
  });

  it("returns 404 when the follow-up belongs to a different route patient", async () => {
    prismaMocks.followUpFindFirst.mockResolvedValueOnce(null);

    const response = await PATCH(createRequest(), createContext("other-follow-up"));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Follow-up not found." });
    expect(prismaMocks.followUpFindFirst).toHaveBeenCalledWith({
      where: {
        id: "other-follow-up",
        patientId: "patient-1",
      },
      select: { id: true, patientId: true },
    });
    expect(prismaMocks.followUpUpdate).not.toHaveBeenCalled();
  });

  it("returns 404 when the signed-in user is not a member of the follow-up patient", async () => {
    prismaMocks.followUpFindFirst.mockResolvedValueOnce({
      id: "follow-up-1",
      patientId: "patient-1",
    });
    authMocks.getPatientMembership.mockResolvedValueOnce(null);

    const response = await PATCH(createRequest(), createContext());

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Follow-up not found." });
    expect(authMocks.getPatientMembership).toHaveBeenCalledWith("patient-1", "user-1");
    expect(prismaMocks.followUpUpdate).not.toHaveBeenCalled();
  });

  it("returns 403 when VIEWER tries to edit a follow-up", async () => {
    prismaMocks.followUpFindFirst.mockResolvedValueOnce({
      id: "follow-up-1",
      patientId: "patient-1",
    });
    mockMembership(PatientRole.VIEWER);

    const response = await PATCH(createRequest(), createContext());

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Forbidden." });
    expect(prismaMocks.followUpUpdate).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid appointmentAt", async () => {
    prismaMocks.followUpFindFirst.mockResolvedValueOnce({
      id: "follow-up-1",
      patientId: "patient-1",
    });

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

  it.each([PatientRole.PRIMARY_CAREGIVER, PatientRole.CAREGIVER])(
    "allows %s to edit a follow-up",
    async (role) => {
      mockMembership(role);
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

      prismaMocks.followUpFindFirst.mockResolvedValueOnce({
        id: "follow-up-1",
        patientId: "patient-1",
      });
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
    },
  );

  it("updates only current editable fields", async () => {
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

    prismaMocks.followUpFindFirst.mockResolvedValueOnce({
      id: "follow-up-1",
      patientId: "patient-1",
    });
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
    prismaMocks.followUpFindFirst.mockResolvedValueOnce({
      id: "follow-up-2",
      patientId: "patient-1",
    });
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
        select: { id: true, patientId: true },
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

    prismaMocks.followUpFindFirst.mockResolvedValueOnce({
      id: "follow-up-1",
      patientId: "patient-1",
    });
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
    prismaMocks.followUpFindFirst.mockResolvedValueOnce({
      id: "follow-up-1",
      patientId: "patient-1",
    });

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
