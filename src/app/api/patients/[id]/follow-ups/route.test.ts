import { PatientRole } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => ({
  followUpFindMany: vi.fn(),
  followUpCreate: vi.fn(),
}));

const authMocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getPatientMembership: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    followUp: {
      findMany: prismaMocks.followUpFindMany,
      create: prismaMocks.followUpCreate,
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
import { GET, POST } from "./route";

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

function createPostRequest(body: unknown = createPayload()) {
  return new Request("http://localhost/api/patients/patient-1/follow-ups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createGetRequest() {
  return new Request("http://localhost/api/patients/patient-1/follow-ups", {
    method: "GET",
  });
}

function createContext() {
  return {
    params: Promise.resolve({ id: "patient-1" }),
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

describe("follow-ups route", () => {
  beforeEach(() => {
    mockSignedInUser();
    mockMembership(PatientRole.PRIMARY_CAREGIVER);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["GET", GET, createGetRequest()],
    ["POST", POST, createPostRequest()],
  ] as const)("returns 401 on %s when the request is unauthenticated", async (_method, handler, request) => {
    authMocks.getCurrentUser.mockResolvedValueOnce(null);

    const response = await handler(request, createContext());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Authentication required." });
    expect(authMocks.getPatientMembership).not.toHaveBeenCalled();
    expect(prismaMocks.followUpFindMany).not.toHaveBeenCalled();
    expect(prismaMocks.followUpCreate).not.toHaveBeenCalled();
  });

  it.each([
    ["GET", GET, createGetRequest()],
    ["POST", POST, createPostRequest()],
  ] as const)("returns 404 on %s when the signed-in user is not a patient member", async (_method, handler, request) => {
    authMocks.getPatientMembership.mockResolvedValueOnce(null);

    const response = await handler(request, createContext());

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Patient not found." });
    expect(prismaMocks.followUpFindMany).not.toHaveBeenCalled();
    expect(prismaMocks.followUpCreate).not.toHaveBeenCalled();
  });

  it.each([PatientRole.PRIMARY_CAREGIVER, PatientRole.CAREGIVER, PatientRole.VIEWER])(
    "allows %s to list follow-ups",
    async (role) => {
      mockMembership(role);
      const followUps = [
        {
          id: "follow-up-1",
          patientId: "patient-1",
          appointmentAt: new Date("2026-05-16T10:30:00.000Z"),
          doctorName: "Dr. Rao",
          hospitalName: "City Clinic",
          reason: "Routine follow-up",
          notes: "Bring previous records",
          status: FOLLOW_UP_STATUS.UPCOMING,
        },
      ];

      prismaMocks.followUpFindMany.mockResolvedValueOnce(followUps);

      const response = await GET(createGetRequest(), createContext());

      expect(response.status).toBe(200);
      expect(prismaMocks.followUpFindMany).toHaveBeenCalledWith({
        where: { patientId: "patient-1" },
        orderBy: { appointmentAt: "asc" },
      });
      expect(await response.json()).toEqual([
        {
          ...followUps[0],
          appointmentAt: followUps[0].appointmentAt.toISOString(),
        },
      ]);
    },
  );

  it.each([PatientRole.PRIMARY_CAREGIVER, PatientRole.CAREGIVER])(
    "allows %s to create a follow-up",
    async (role) => {
      mockMembership(role);
      const createdFollowUp = {
        id: "follow-up-1",
        patientId: "patient-1",
        appointmentAt: new Date("2026-05-16T10:30:00.000Z"),
        doctorName: "Dr. Rao",
        hospitalName: "City Clinic",
        reason: "Routine follow-up",
        notes: "Bring previous records",
        status: FOLLOW_UP_STATUS.UPCOMING,
      };

      prismaMocks.followUpCreate.mockResolvedValueOnce(createdFollowUp);

      const response = await POST(createPostRequest(), createContext());

      expect(response.status).toBe(201);
      expect(prismaMocks.followUpCreate).toHaveBeenCalledWith({
        data: {
          patientId: "patient-1",
          appointmentAt: new Date("2026-05-16T10:30"),
          doctorName: "Dr. Rao",
          hospitalName: "City Clinic",
          reason: "Routine follow-up",
          notes: "Bring previous records",
          status: FOLLOW_UP_STATUS.UPCOMING,
        },
      });
      expect(await response.json()).toEqual({
        ...createdFollowUp,
        appointmentAt: createdFollowUp.appointmentAt.toISOString(),
      });
    },
  );

  it("returns 403 when VIEWER tries to create a follow-up", async () => {
    mockMembership(PatientRole.VIEWER);

    const response = await POST(createPostRequest(), createContext());

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Forbidden." });
    expect(prismaMocks.followUpCreate).not.toHaveBeenCalled();
  });

  it("returns 400 on POST for invalid appointmentAt", async () => {
    const response = await POST(
      createPostRequest(createPayload({ appointmentAt: "not-a-date" })),
      createContext(),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      errors: {
        appointmentAt: "Appointment date and time must be a valid date and time.",
      },
    });
    expect(prismaMocks.followUpCreate).not.toHaveBeenCalled();
  });

  it("creates a follow-up using the route patient id", async () => {
    const createdFollowUp = {
      id: "follow-up-1",
      patientId: "patient-1",
      appointmentAt: new Date("2026-05-16T10:30:00.000Z"),
      doctorName: "Dr. Rao",
      hospitalName: "City Clinic",
      reason: "Routine follow-up",
      notes: "Bring previous records",
      status: FOLLOW_UP_STATUS.UPCOMING,
    };

    prismaMocks.followUpCreate.mockResolvedValueOnce(createdFollowUp);

    const response = await POST(createPostRequest(), createContext());

    expect(response.status).toBe(201);
    expect(prismaMocks.followUpCreate).toHaveBeenCalledWith({
      data: {
        patientId: "patient-1",
        appointmentAt: new Date("2026-05-16T10:30"),
        doctorName: "Dr. Rao",
        hospitalName: "City Clinic",
        reason: "Routine follow-up",
        notes: "Bring previous records",
        status: FOLLOW_UP_STATUS.UPCOMING,
      },
    });
    expect(await response.json()).toEqual({
      ...createdFollowUp,
      appointmentAt: createdFollowUp.appointmentAt.toISOString(),
    });
  });

  it("trims and normalizes optional blank fields to null on POST", async () => {
    const createdFollowUp = {
      id: "follow-up-1",
      patientId: "patient-1",
      appointmentAt: new Date("2026-05-16T10:30:00.000Z"),
      doctorName: null,
      hospitalName: null,
      reason: null,
      notes: null,
      status: FOLLOW_UP_STATUS.UPCOMING,
    };

    prismaMocks.followUpCreate.mockResolvedValueOnce(createdFollowUp);

    const response = await POST(
      createPostRequest({
        appointmentAt: " 2026-05-16T10:30 ",
        doctorName: "   ",
        hospitalName: "",
        reason: null,
        notes: undefined,
      }),
      createContext(),
    );

    expect(response.status).toBe(201);
    expect(prismaMocks.followUpCreate).toHaveBeenCalledWith({
      data: {
        patientId: "patient-1",
        appointmentAt: new Date("2026-05-16T10:30"),
        doctorName: null,
        hospitalName: null,
        reason: null,
        notes: null,
        status: FOLLOW_UP_STATUS.UPCOMING,
      },
    });
  });

  it("keeps status UPCOMING on POST when no status is provided", async () => {
    const createdFollowUp = {
      id: "follow-up-1",
      patientId: "patient-1",
      appointmentAt: new Date("2026-05-16T10:30:00.000Z"),
      doctorName: null,
      hospitalName: null,
      reason: null,
      notes: null,
      status: FOLLOW_UP_STATUS.UPCOMING,
    };

    prismaMocks.followUpCreate.mockResolvedValueOnce(createdFollowUp);

    const response = await POST(
      createPostRequest({
        appointmentAt: "2026-05-16T10:30",
      }),
      createContext(),
    );

    expect(response.status).toBe(201);
    expect(prismaMocks.followUpCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: FOLLOW_UP_STATUS.UPCOMING,
      }),
    });
  });

  it("rejects unsupported status on POST", async () => {
    const response = await POST(
      createPostRequest(createPayload({ status: "DONE" })),
      createContext(),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      errors: {
        status: "Status must be UPCOMING.",
      },
    });
    expect(prismaMocks.followUpCreate).not.toHaveBeenCalled();
  });
});
