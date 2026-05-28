import { PatientRole } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => ({
  bpReadingFindMany: vi.fn(),
  bpReadingCreate: vi.fn(),
}));

const authMocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getPatientMembership: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    bPReading: {
      findMany: prismaMocks.bpReadingFindMany,
      create: prismaMocks.bpReadingCreate,
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

import { GET, POST } from "./route";

function createPayload(overrides: Record<string, unknown> = {}) {
  return {
    systolic: "120",
    diastolic: "80",
    pulse: "72",
    measuredAt: "2026-05-16T10:30",
    notes: "Care note",
    ...overrides,
  };
}

function createPostRequest(body: unknown = createPayload()) {
  return new Request("http://localhost/api/patients/patient-1/bp-readings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createGetRequest() {
  return new Request("http://localhost/api/patients/patient-1/bp-readings", {
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

describe("BP readings route", () => {
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
    expect(prismaMocks.bpReadingFindMany).not.toHaveBeenCalled();
    expect(prismaMocks.bpReadingCreate).not.toHaveBeenCalled();
  });

  it.each([
    ["GET", GET, createGetRequest()],
    ["POST", POST, createPostRequest()],
  ] as const)("returns 404 on %s when the signed-in user is not a patient member", async (_method, handler, request) => {
    authMocks.getPatientMembership.mockResolvedValueOnce(null);

    const response = await handler(request, createContext());

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Patient not found." });
    expect(prismaMocks.bpReadingFindMany).not.toHaveBeenCalled();
    expect(prismaMocks.bpReadingCreate).not.toHaveBeenCalled();
  });

  it.each([PatientRole.PRIMARY_CAREGIVER, PatientRole.CAREGIVER, PatientRole.VIEWER])(
    "allows %s to list BP readings",
    async (role) => {
      mockMembership(role);
      const readings = [
        {
          id: "bp-1",
          patientId: "patient-1",
          systolic: 120,
          diastolic: 80,
          pulse: null,
          measuredAt: new Date("2026-05-16T10:30:00.000Z"),
          notes: null,
        },
      ];
      prismaMocks.bpReadingFindMany.mockResolvedValueOnce(readings);

      const response = await GET(createGetRequest(), createContext());

      expect(response.status).toBe(200);
      expect(prismaMocks.bpReadingFindMany).toHaveBeenCalledWith({
        where: { patientId: "patient-1" },
        orderBy: { measuredAt: "desc" },
      });
      expect(await response.json()).toEqual([
        {
          ...readings[0],
          measuredAt: readings[0].measuredAt.toISOString(),
        },
      ]);
    },
  );

  it.each([PatientRole.PRIMARY_CAREGIVER, PatientRole.CAREGIVER])(
    "allows %s to create a BP reading",
    async (role) => {
      mockMembership(role);
      const createdReading = {
        id: "bp-1",
        patientId: "patient-1",
        systolic: 120,
        diastolic: 80,
        pulse: 72,
        measuredAt: new Date("2026-05-16T10:30:00.000Z"),
        notes: "Care note",
      };
      prismaMocks.bpReadingCreate.mockResolvedValueOnce(createdReading);

      const response = await POST(createPostRequest(), createContext());

      expect(response.status).toBe(201);
      expect(prismaMocks.bpReadingCreate).toHaveBeenCalledWith({
        data: {
          patientId: "patient-1",
          systolic: 120,
          diastolic: 80,
          pulse: 72,
          measuredAt: new Date("2026-05-16T10:30"),
          notes: "Care note",
        },
      });
      expect(await response.json()).toEqual({
        ...createdReading,
        measuredAt: createdReading.measuredAt.toISOString(),
      });
    },
  );

  it("returns 403 when VIEWER tries to create a BP reading", async () => {
    mockMembership(PatientRole.VIEWER);

    const response = await POST(createPostRequest(), createContext());

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Forbidden." });
    expect(prismaMocks.bpReadingCreate).not.toHaveBeenCalled();
  });

  it("returns 400 on POST for invalid BP input", async () => {
    const response = await POST(createPostRequest(createPayload({ systolic: "301" })), createContext());

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      errors: {
        systolic: "Systolic reading must be between 1 and 300.",
      },
    });
    expect(prismaMocks.bpReadingCreate).not.toHaveBeenCalled();
  });

  it("creates a BP reading using the route patient id", async () => {
    const createdReading = {
      id: "bp-1",
      patientId: "patient-1",
      systolic: 120,
      diastolic: 80,
      pulse: 72,
      measuredAt: new Date("2026-05-16T10:30:00.000Z"),
      notes: "Care note",
    };

    prismaMocks.bpReadingCreate.mockResolvedValueOnce(createdReading);

    const response = await POST(createPostRequest(), createContext());

    expect(response.status).toBe(201);
    expect(prismaMocks.bpReadingCreate).toHaveBeenCalledWith({
      data: {
        patientId: "patient-1",
        systolic: 120,
        diastolic: 80,
        pulse: 72,
        measuredAt: new Date("2026-05-16T10:30"),
        notes: "Care note",
      },
    });
    expect(await response.json()).toEqual({
      ...createdReading,
      measuredAt: createdReading.measuredAt.toISOString(),
    });
  });
});
