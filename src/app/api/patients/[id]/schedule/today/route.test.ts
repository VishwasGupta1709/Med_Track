import { PatientRole } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => ({
  doseEventFindMany: vi.fn(),
}));

const authMocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getPatientMembership: vi.fn(),
}));

const scheduleMocks = vi.hoisted(() => ({
  getTodayWindow: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    doseEvent: {
      findMany: prismaMocks.doseEventFindMany,
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

vi.mock("@/lib/schedule-generation", () => ({
  getTodayWindow: scheduleMocks.getTodayWindow,
}));

import { GET } from "./route";

function createRequest() {
  return new Request("http://localhost/api/patients/patient-1/schedule/today", {
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

describe("today schedule route", () => {
  const todayWindow = {
    start: new Date("2026-05-16T00:00:00.000Z"),
    end: new Date("2026-05-17T00:00:00.000Z"),
  };

  beforeEach(() => {
    mockSignedInUser();
    mockMembership(PatientRole.PRIMARY_CAREGIVER);
    scheduleMocks.getTodayWindow.mockReturnValue(todayWindow);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when the request is unauthenticated", async () => {
    authMocks.getCurrentUser.mockResolvedValueOnce(null);

    const response = await GET(createRequest(), createContext());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Authentication required." });
    expect(authMocks.getPatientMembership).not.toHaveBeenCalled();
    expect(prismaMocks.doseEventFindMany).not.toHaveBeenCalled();
  });

  it("returns 404 when the signed-in user is not a patient member", async () => {
    authMocks.getPatientMembership.mockResolvedValueOnce(null);

    const response = await GET(createRequest(), createContext());

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Patient not found." });
    expect(prismaMocks.doseEventFindMany).not.toHaveBeenCalled();
  });

  it.each([PatientRole.PRIMARY_CAREGIVER, PatientRole.CAREGIVER, PatientRole.VIEWER])(
    "allows %s to view today's schedule",
    async (role) => {
      mockMembership(role);
      const doseEvents = [{ id: "dose-1", patientId: "patient-1", status: "PENDING" }];
      prismaMocks.doseEventFindMany.mockResolvedValueOnce(doseEvents);

      const response = await GET(createRequest(), createContext());

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(doseEvents);
      expect(prismaMocks.doseEventFindMany).toHaveBeenCalledWith({
        where: {
          patientId: "patient-1",
          scheduledAt: {
            gte: todayWindow.start,
            lt: todayWindow.end,
          },
        },
        orderBy: { scheduledAt: "asc" },
      });
    },
  );
});
