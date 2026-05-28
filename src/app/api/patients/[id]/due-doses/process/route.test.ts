import { PatientRole } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getPatientMembership: vi.fn(),
}));

const dueDoseMocks = vi.hoisted(() => ({
  processDueDosesForPatient: vi.fn(),
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

vi.mock("@/lib/due-dose-processing", () => ({
  processDueDosesForPatient: dueDoseMocks.processDueDosesForPatient,
}));

import { prisma } from "@/lib/prisma";
import { POST } from "./route";

function createRequest() {
  return new Request("http://localhost/api/patients/patient-1/due-doses/process", {
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

describe("process due doses route", () => {
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
    expect(dueDoseMocks.processDueDosesForPatient).not.toHaveBeenCalled();
  });

  it("returns 404 when the signed-in user is not a patient member", async () => {
    authMocks.getPatientMembership.mockResolvedValueOnce(null);

    const response = await POST(createRequest(), createContext());

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Patient not found." });
    expect(dueDoseMocks.processDueDosesForPatient).not.toHaveBeenCalled();
  });

  it.each([PatientRole.PRIMARY_CAREGIVER, PatientRole.CAREGIVER])(
    "allows %s to process due doses",
    async (role) => {
      mockMembership(role);
      const result = { processedAt: "2026-05-16T10:00:00.000Z", processed: 2 };
      dueDoseMocks.processDueDosesForPatient.mockResolvedValueOnce(result);

      const response = await POST(createRequest(), createContext());

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(result);
      expect(dueDoseMocks.processDueDosesForPatient).toHaveBeenCalledWith(prisma, "patient-1");
    },
  );

  it("returns 403 when VIEWER tries to process due doses", async () => {
    mockMembership(PatientRole.VIEWER);

    const response = await POST(createRequest(), createContext());

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Forbidden." });
    expect(dueDoseMocks.processDueDosesForPatient).not.toHaveBeenCalled();
  });
});
