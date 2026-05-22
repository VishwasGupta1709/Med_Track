import { afterEach, describe, expect, it, vi } from "vitest";
import { PatientRole } from "@prisma/client";

const authMocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}));

const patientAccessMocks = vi.hoisted(() => ({
  requirePatientMembership: vi.fn(),
}));

const prismaMocks = vi.hoisted(() => ({
  patientFindUnique: vi.fn(),
}));

vi.mock("@/lib/auth/current-user", () => ({
  getCurrentUser: authMocks.getCurrentUser,
}));

vi.mock("@/lib/auth/patient-access", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/patient-access")>();

  return {
    ...actual,
    requirePatientMembership: patientAccessMocks.requirePatientMembership,
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    patient: {
      findUnique: prismaMocks.patientFindUnique,
    },
  },
}));

import { VIEW_PATIENT_ROLES } from "@/lib/auth/patient-access";
import { GET } from "./route";

function createCurrentUser() {
  return {
    id: "local-user-1",
    clerkUserId: "clerk-user-1",
    email: "caregiver@example.com",
    displayName: "Care Giver",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function createRequest() {
  return new Request("http://localhost/api/patients/patient-1", {
    method: "GET",
  });
}

function createContext() {
  return {
    params: Promise.resolve({ id: "patient-1" }),
  };
}

describe("patient detail route", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    authMocks.getCurrentUser.mockResolvedValueOnce(null);

    const response = await GET(createRequest(), createContext());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Authentication required." });
    expect(patientAccessMocks.requirePatientMembership).not.toHaveBeenCalled();
    expect(prismaMocks.patientFindUnique).not.toHaveBeenCalled();
  });

  it("returns 404 when the patient is missing or the user is not a member", async () => {
    authMocks.getCurrentUser.mockResolvedValueOnce(createCurrentUser());
    patientAccessMocks.requirePatientMembership.mockRejectedValueOnce(
      new Error("Patient access required."),
    );

    const response = await GET(createRequest(), createContext());

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Patient not found." });
    expect(patientAccessMocks.requirePatientMembership).toHaveBeenCalledWith(
      "patient-1",
      "local-user-1",
      VIEW_PATIENT_ROLES,
    );
    expect(prismaMocks.patientFindUnique).not.toHaveBeenCalled();
  });

  it("returns patient data for a member", async () => {
    const patient = {
      id: "patient-1",
      fullName: "Asha Rao",
      age: 72,
      relationship: "Mother",
      phoneNumber: "555-0101",
      notes: null,
      createdByUserId: "local-user-1",
      createdAt: new Date("2026-05-16T10:30:00.000Z"),
      updatedAt: new Date("2026-05-16T10:30:00.000Z"),
    };
    authMocks.getCurrentUser.mockResolvedValueOnce(createCurrentUser());
    patientAccessMocks.requirePatientMembership.mockResolvedValueOnce({
      id: "membership-1",
      patientId: "patient-1",
      userId: "local-user-1",
      role: PatientRole.VIEWER,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    prismaMocks.patientFindUnique.mockResolvedValueOnce(patient);

    const response = await GET(createRequest(), createContext());

    expect(response.status).toBe(200);
    expect(prismaMocks.patientFindUnique).toHaveBeenCalledWith({
      where: { id: "patient-1" },
    });
    expect(await response.json()).toEqual({
      ...patient,
      createdAt: patient.createdAt.toISOString(),
      updatedAt: patient.updatedAt.toISOString(),
    });
  });
});
