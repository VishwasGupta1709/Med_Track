import { PatientRole } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getPatientMembership: vi.fn(),
}));

const scheduleMocks = vi.hoisted(() => ({
  generateDoseEventsForPatient: vi.fn(),
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

vi.mock("@/lib/schedule-generation", () => ({
  generateDoseEventsForPatient: scheduleMocks.generateDoseEventsForPatient,
}));

import { prisma } from "@/lib/prisma";
import { POST } from "./route";

function createRequest() {
  return new Request("http://localhost/api/patients/patient-1/schedule/generate", {
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

describe("generate schedule route", () => {
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
    expect(scheduleMocks.generateDoseEventsForPatient).not.toHaveBeenCalled();
  });

  it("returns 404 when the signed-in user is not a patient member", async () => {
    authMocks.getPatientMembership.mockResolvedValueOnce(null);

    const response = await POST(createRequest(), createContext());

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Patient not found." });
    expect(scheduleMocks.generateDoseEventsForPatient).not.toHaveBeenCalled();
  });

  it("allows PRIMARY_CAREGIVER to generate a schedule", async () => {
    const result = {
      generatedWindowStart: "2026-05-16T00:00:00.000Z",
      generatedWindowEnd: "2026-05-23T00:00:00.000Z",
      attempted: 2,
      created: 2,
    };
    scheduleMocks.generateDoseEventsForPatient.mockResolvedValueOnce(result);

    const response = await POST(createRequest(), createContext());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(result);
    expect(scheduleMocks.generateDoseEventsForPatient).toHaveBeenCalledWith(prisma, "patient-1");
  });

  it.each([PatientRole.CAREGIVER, PatientRole.VIEWER])(
    "returns 403 when %s tries to generate a schedule",
    async (role) => {
      mockMembership(role);

      const response = await POST(createRequest(), createContext());

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: "Forbidden." });
      expect(scheduleMocks.generateDoseEventsForPatient).not.toHaveBeenCalled();
    },
  );
});
