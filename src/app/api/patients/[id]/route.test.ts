import { PatientRole } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => ({
  patientFindFirst: vi.fn(),
}));

const authMocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    patient: {
      findFirst: prismaMocks.patientFindFirst,
    },
  },
}));

vi.mock("@/lib/auth/current-user", () => ({
  getCurrentUser: authMocks.getCurrentUser,
}));

import { GET } from "./route";

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

function mockSignedInUser(role: PatientRole = PatientRole.PRIMARY_CAREGIVER) {
  authMocks.getCurrentUser.mockResolvedValue({ id: "user-1", role });
}

describe("patient detail route", () => {
  beforeEach(() => {
    mockSignedInUser();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when the request is unauthenticated", async () => {
    authMocks.getCurrentUser.mockResolvedValueOnce(null);

    const response = await GET(createRequest(), createContext());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Authentication required." });
    expect(prismaMocks.patientFindFirst).not.toHaveBeenCalled();
  });

  it("returns 404 when the patient is missing", async () => {
    prismaMocks.patientFindFirst.mockResolvedValueOnce(null);

    const response = await GET(createRequest(), createContext());

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Patient not found." });
  });

  it("returns 404 when the signed-in user is not a member of an existing patient", async () => {
    prismaMocks.patientFindFirst.mockResolvedValueOnce(null);

    const response = await GET(createRequest(), createContext());

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Patient not found." });
    expect(prismaMocks.patientFindFirst).toHaveBeenCalledWith({
      where: {
        id: "patient-1",
        members: {
          some: {
            userId: "user-1",
          },
        },
      },
    });
  });

  it.each([PatientRole.PRIMARY_CAREGIVER, PatientRole.CAREGIVER, PatientRole.VIEWER])(
    "allows %s to view a patient when they are a member",
    async (role) => {
      mockSignedInUser(role);
      const patient = {
        id: "patient-1",
        fullName: "Asha Rao",
        createdAt: new Date("2026-05-16T10:30:00.000Z"),
      };
      prismaMocks.patientFindFirst.mockResolvedValueOnce(patient);

      const response = await GET(createRequest(), createContext());

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        ...patient,
        createdAt: patient.createdAt.toISOString(),
      });
    },
  );
});
