import { PatientRole } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  updateMany: vi.fn(),
}));

const authMocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getPatientMembership: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    doseEvent: {
      findFirst: prismaMocks.findFirst,
      updateMany: prismaMocks.updateMany,
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

import { POST } from "./route";

function createRequest(body: unknown) {
  return new Request("http://localhost/api/dose-events/dose-1/skip", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createContext() {
  return {
    params: Promise.resolve({ id: "dose-1" }),
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

describe("skip dose event route", () => {
  beforeEach(() => {
    mockSignedInUser();
    mockMembership(PatientRole.PRIMARY_CAREGIVER);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when the request is unauthenticated", async () => {
    authMocks.getCurrentUser.mockResolvedValueOnce(null);

    const response = await POST(createRequest({ skippedReason: "a".repeat(501) }), createContext());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Authentication required." });
    expect(prismaMocks.findFirst).not.toHaveBeenCalled();
    expect(authMocks.getPatientMembership).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid skipped reason", async () => {
    prismaMocks.findFirst.mockResolvedValueOnce({ id: "dose-1", patientId: "patient-1" });

    const response = await POST(
      createRequest({ skippedReason: "a".repeat(501) }),
      createContext(),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      errors: {
        skippedReason: "Skipped reason must be 500 characters or less.",
      },
    });
    expect(prismaMocks.updateMany).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid confirmation note", async () => {
    prismaMocks.findFirst.mockResolvedValueOnce({ id: "dose-1", patientId: "patient-1" });

    const response = await POST(
      createRequest({ confirmationNote: "a".repeat(501) }),
      createContext(),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      errors: {
        confirmationNote: "Confirmation note must be 500 characters or less.",
      },
    });
    expect(prismaMocks.updateMany).not.toHaveBeenCalled();
  });

  it("returns 404 when the dose event is missing", async () => {
    prismaMocks.findFirst.mockResolvedValueOnce(null);

    const response = await POST(createRequest({}), createContext());

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Dose event not found." });
    expect(prismaMocks.findFirst).toHaveBeenCalledWith({
      where: {
        id: "dose-1",
      },
      select: { id: true, patientId: true },
    });
    expect(authMocks.getPatientMembership).not.toHaveBeenCalled();
    expect(prismaMocks.updateMany).not.toHaveBeenCalled();
  });

  it("returns 404 when the signed-in user is not a member of the dose event patient", async () => {
    prismaMocks.findFirst.mockResolvedValueOnce({ id: "dose-1", patientId: "patient-1" });
    authMocks.getPatientMembership.mockResolvedValueOnce(null);

    const response = await POST(createRequest({}), createContext());

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Dose event not found." });
    expect(authMocks.getPatientMembership).toHaveBeenCalledWith("patient-1", "user-1");
    expect(prismaMocks.updateMany).not.toHaveBeenCalled();
  });

  it("returns 403 when VIEWER tries to skip a dose", async () => {
    prismaMocks.findFirst.mockResolvedValueOnce({ id: "dose-1", patientId: "patient-1" });
    mockMembership(PatientRole.VIEWER);

    const response = await POST(createRequest({}), createContext());

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Forbidden." });
    expect(prismaMocks.updateMany).not.toHaveBeenCalled();
  });

  it("returns 409 when the dose event can no longer be skipped", async () => {
    prismaMocks.findFirst.mockResolvedValueOnce({ id: "dose-1", patientId: "patient-1" });
    prismaMocks.updateMany.mockResolvedValueOnce({ count: 0 });

    const response = await POST(createRequest({}), createContext());

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "Dose event can no longer be skipped.",
    });
  });

  it.each([PatientRole.PRIMARY_CAREGIVER, PatientRole.CAREGIVER])(
    "allows %s to skip a dose",
    async (role) => {
      mockMembership(role);
      const updatedDoseEvent = {
        id: "dose-1",
        patientId: "patient-1",
        status: "SKIPPED",
        skippedReason: "Away from home",
      };
      prismaMocks.findFirst
        .mockResolvedValueOnce({ id: "dose-1", patientId: "patient-1" })
        .mockResolvedValueOnce(updatedDoseEvent);
      prismaMocks.updateMany.mockResolvedValueOnce({ count: 1 });

      const response = await POST(
        createRequest({ skippedReason: "Away from home" }),
        createContext(),
      );

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(updatedDoseEvent);
      expect(prismaMocks.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: "dose-1",
          }),
          data: expect.objectContaining({
            status: "SKIPPED",
            confirmedByUserId: "user-1",
            skippedReason: "Away from home",
          }),
        }),
      );
      expect(prismaMocks.findFirst).toHaveBeenNthCalledWith(2, {
        where: {
          id: "dose-1",
          patientId: "patient-1",
        },
      });
    },
  );

  it("uses the signed-in local user id when skipping a dose", async () => {
    const updatedDoseEvent = {
      id: "dose-1",
      status: "SKIPPED",
      skippedReason: "Away from home",
    };
    prismaMocks.findFirst
      .mockResolvedValueOnce({ id: "dose-1", patientId: "patient-1" })
      .mockResolvedValueOnce(updatedDoseEvent);
    prismaMocks.updateMany.mockResolvedValueOnce({ count: 1 });

    const response = await POST(
      createRequest({ skippedReason: "Away from home" }),
      createContext(),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(updatedDoseEvent);
    expect(prismaMocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "dose-1",
        }),
        data: expect.objectContaining({
          status: "SKIPPED",
          confirmedByUserId: "user-1",
          skippedReason: "Away from home",
        }),
      }),
    );
  });
});
