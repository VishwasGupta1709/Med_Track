import { PatientRole } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => ({
  bpReadingFindFirst: vi.fn(),
  bpReadingUpdate: vi.fn(),
}));

const authMocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getPatientMembership: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    bPReading: {
      findFirst: prismaMocks.bpReadingFindFirst,
      update: prismaMocks.bpReadingUpdate,
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

import { PATCH } from "./route";

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

function createRequest(body: unknown = createPayload()) {
  return new Request("http://localhost/api/patients/patient-1/bp-readings/bp-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createContext(readingId = "bp-1") {
  return {
    params: Promise.resolve({ id: "patient-1", readingId }),
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

describe("edit BP reading route", () => {
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
    expect(prismaMocks.bpReadingFindFirst).not.toHaveBeenCalled();
    expect(prismaMocks.bpReadingUpdate).not.toHaveBeenCalled();
  });

  it("returns 404 when the BP reading is missing", async () => {
    prismaMocks.bpReadingFindFirst.mockResolvedValueOnce(null);

    const response = await PATCH(createRequest(), createContext());

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "BP reading not found." });
    expect(prismaMocks.bpReadingFindFirst).toHaveBeenCalledWith({
      where: {
        id: "bp-1",
        patientId: "patient-1",
      },
      select: { id: true, patientId: true },
    });
    expect(authMocks.getPatientMembership).not.toHaveBeenCalled();
    expect(prismaMocks.bpReadingUpdate).not.toHaveBeenCalled();
  });

  it("returns 404 when the BP reading belongs to a different route patient", async () => {
    prismaMocks.bpReadingFindFirst.mockResolvedValueOnce(null);

    const response = await PATCH(createRequest(), createContext("other-bp"));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "BP reading not found." });
    expect(prismaMocks.bpReadingFindFirst).toHaveBeenCalledWith({
      where: {
        id: "other-bp",
        patientId: "patient-1",
      },
      select: { id: true, patientId: true },
    });
    expect(prismaMocks.bpReadingUpdate).not.toHaveBeenCalled();
  });

  it("returns 404 when the signed-in user is not a member of the BP reading patient", async () => {
    prismaMocks.bpReadingFindFirst.mockResolvedValueOnce({ id: "bp-1", patientId: "patient-1" });
    authMocks.getPatientMembership.mockResolvedValueOnce(null);

    const response = await PATCH(createRequest(), createContext());

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "BP reading not found." });
    expect(authMocks.getPatientMembership).toHaveBeenCalledWith("patient-1", "user-1");
    expect(prismaMocks.bpReadingUpdate).not.toHaveBeenCalled();
  });

  it("returns 403 when VIEWER tries to edit a BP reading", async () => {
    prismaMocks.bpReadingFindFirst.mockResolvedValueOnce({ id: "bp-1", patientId: "patient-1" });
    mockMembership(PatientRole.VIEWER);

    const response = await PATCH(createRequest(), createContext());

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Forbidden." });
    expect(prismaMocks.bpReadingUpdate).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid BP input", async () => {
    prismaMocks.bpReadingFindFirst.mockResolvedValueOnce({ id: "bp-1", patientId: "patient-1" });

    const response = await PATCH(createRequest(createPayload({ systolic: "301" })), createContext());

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      errors: {
        systolic: "Systolic reading must be between 1 and 300.",
      },
    });
    expect(prismaMocks.bpReadingUpdate).not.toHaveBeenCalled();
  });

  it.each([PatientRole.PRIMARY_CAREGIVER, PatientRole.CAREGIVER])(
    "allows %s to edit a BP reading",
    async (role) => {
      mockMembership(role);
      const updatedReading = {
        id: "bp-1",
        patientId: "patient-1",
        systolic: 122,
        diastolic: 82,
        pulse: 74,
        measuredAt: new Date("2026-05-16T10:45:00.000Z"),
        notes: "Updated note",
      };

      prismaMocks.bpReadingFindFirst.mockResolvedValueOnce({ id: "bp-1", patientId: "patient-1" });
      prismaMocks.bpReadingUpdate.mockResolvedValueOnce(updatedReading);

      const response = await PATCH(
        createRequest(
          createPayload({
            systolic: "122",
            diastolic: "82",
            pulse: "74",
            measuredAt: "2026-05-16T10:45",
            notes: "Updated note",
          }),
        ),
        createContext(),
      );

      expect(response.status).toBe(200);
      expect(prismaMocks.bpReadingUpdate).toHaveBeenCalledWith({
        where: { id: "bp-1" },
        data: {
          systolic: 122,
          diastolic: 82,
          pulse: 74,
          measuredAt: new Date("2026-05-16T10:45"),
          notes: "Updated note",
        },
      });
      expect(await response.json()).toEqual({
        ...updatedReading,
        measuredAt: updatedReading.measuredAt.toISOString(),
      });
    },
  );

  it("updates only existing BP reading scalar fields", async () => {
    const updatedReading = {
      id: "bp-1",
      patientId: "patient-1",
      systolic: 122,
      diastolic: 82,
      pulse: 74,
      measuredAt: new Date("2026-05-16T10:45:00.000Z"),
      notes: "Updated note",
    };

    prismaMocks.bpReadingFindFirst.mockResolvedValueOnce({ id: "bp-1", patientId: "patient-1" });
    prismaMocks.bpReadingUpdate.mockResolvedValueOnce(updatedReading);

    const response = await PATCH(
      createRequest(
        createPayload({
          systolic: "122",
          diastolic: "82",
          pulse: "74",
          measuredAt: "2026-05-16T10:45",
          notes: "Updated note",
        }),
      ),
      createContext(),
    );

    expect(response.status).toBe(200);
    expect(prismaMocks.bpReadingUpdate).toHaveBeenCalledWith({
      where: { id: "bp-1" },
      data: {
        systolic: 122,
        diastolic: 82,
        pulse: 74,
        measuredAt: new Date("2026-05-16T10:45"),
        notes: "Updated note",
      },
    });
    expect(await response.json()).toEqual({
      ...updatedReading,
      measuredAt: updatedReading.measuredAt.toISOString(),
    });
  });

  it("uses the route patient id and reading id in ownership and update checks", async () => {
    prismaMocks.bpReadingFindFirst.mockResolvedValueOnce({ id: "bp-2", patientId: "patient-1" });
    prismaMocks.bpReadingUpdate.mockResolvedValueOnce({
      id: "bp-2",
      patientId: "patient-1",
      systolic: 120,
      diastolic: 80,
      pulse: null,
      measuredAt: new Date("2026-05-16T10:30:00.000Z"),
      notes: null,
    });

    await PATCH(createRequest(), createContext("bp-2"));

    expect(prismaMocks.bpReadingFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "bp-2",
          patientId: "patient-1",
        },
        select: { id: true, patientId: true },
      }),
    );
    expect(prismaMocks.bpReadingUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "bp-2" },
      }),
    );
  });

  it("allows optional pulse and notes to be cleared", async () => {
    const updatedReading = {
      id: "bp-1",
      patientId: "patient-1",
      systolic: 120,
      diastolic: 80,
      pulse: null,
      measuredAt: new Date("2026-05-16T10:30:00.000Z"),
      notes: null,
    };

    prismaMocks.bpReadingFindFirst.mockResolvedValueOnce({ id: "bp-1", patientId: "patient-1" });
    prismaMocks.bpReadingUpdate.mockResolvedValueOnce(updatedReading);

    const response = await PATCH(
      createRequest(createPayload({ pulse: "", notes: "   " })),
      createContext(),
    );

    expect(response.status).toBe(200);
    expect(prismaMocks.bpReadingUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          pulse: null,
          notes: null,
        }),
      }),
    );
  });
});
