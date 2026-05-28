import { PatientRole } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getPatientMembership: vi.fn(),
}));

const missedDoseMocks = vi.hoisted(() => ({
  processMissedDosesForPatient: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {},
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

vi.mock("@/lib/missed-dose-processing", () => ({
  processMissedDosesForPatient: missedDoseMocks.processMissedDosesForPatient,
}));

import { prisma } from "@/lib/prisma";
import { POST } from "./route";

function createRequest() {
  return new Request("http://localhost/api/patients/patient-1/missed-doses/process", {
    method: "POST",
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

describe("process missed doses route", () => {
  beforeEach(() => {
    mockSignedInUser();
    mockMembership(PatientRole.PRIMARY_CAREGIVER);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when the request is unauthenticated", async () => {
    authMocks.getCurrentUser.mockResolvedValueOnce(null);

    const response = await POST(createRequest(), createContext());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Authentication required." });
    expect(authMocks.getPatientMembership).not.toHaveBeenCalled();
    expect(missedDoseMocks.processMissedDosesForPatient).not.toHaveBeenCalled();
  });

  it("returns 404 when the signed-in user is not a patient member", async () => {
    authMocks.getPatientMembership.mockResolvedValueOnce(null);

    const response = await POST(createRequest(), createContext());

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Patient not found." });
    expect(missedDoseMocks.processMissedDosesForPatient).not.toHaveBeenCalled();
  });

  it.each([PatientRole.PRIMARY_CAREGIVER, PatientRole.CAREGIVER])(
    "allows %s to process missed doses",
    async (role) => {
      mockMembership(role);
      const result = {
        cutoffMinutes: 30,
        cutoffAt: "2026-05-16T09:30:00.000Z",
        processed: 2,
      };
      missedDoseMocks.processMissedDosesForPatient.mockResolvedValueOnce(result);

      const response = await POST(createRequest(), createContext());

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(result);
      expect(missedDoseMocks.processMissedDosesForPatient).toHaveBeenCalledWith(prisma, "patient-1");
    },
  );

  it("returns 403 when VIEWER tries to process missed doses", async () => {
    mockMembership(PatientRole.VIEWER);

    const response = await POST(createRequest(), createContext());

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Forbidden." });
    expect(missedDoseMocks.processMissedDosesForPatient).not.toHaveBeenCalled();
  });
});
