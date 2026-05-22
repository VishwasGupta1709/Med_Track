import { afterEach, describe, expect, it, vi } from "vitest";
import { PatientRole } from "@prisma/client";

const authMocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}));

const prismaMocks = vi.hoisted(() => ({
  patientFindMany: vi.fn(),
  patientCreate: vi.fn(),
  patientMemberCreate: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/auth/current-user", () => ({
  getCurrentUser: authMocks.getCurrentUser,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    patient: {
      findMany: prismaMocks.patientFindMany,
    },
    $transaction: prismaMocks.transaction,
  },
}));

import { GET, POST } from "./route";

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

function createPayload(overrides: Record<string, unknown> = {}) {
  return {
    fullName: "Asha Rao",
    age: "72",
    relationship: "Mother",
    phoneNumber: "555-0101",
    notes: "Care notes",
    ...overrides,
  };
}

function createPostRequest(body: unknown = createPayload()) {
  return new Request("http://localhost/api/patients", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("patients route", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 on GET when unauthenticated", async () => {
    authMocks.getCurrentUser.mockResolvedValueOnce(null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Authentication required." });
    expect(prismaMocks.patientFindMany).not.toHaveBeenCalled();
  });

  it("queries patients by PatientMember user id on GET", async () => {
    const patients = [{ id: "patient-1", fullName: "Asha Rao" }];
    authMocks.getCurrentUser.mockResolvedValueOnce(createCurrentUser());
    prismaMocks.patientFindMany.mockResolvedValueOnce(patients);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(prismaMocks.patientFindMany).toHaveBeenCalledWith({
      where: {
        members: {
          some: {
            userId: "local-user-1",
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    expect(JSON.stringify(prismaMocks.patientFindMany.mock.calls[0][0])).not.toContain("demo-user");
    expect(await response.json()).toEqual(patients);
  });

  it("returns 401 on POST when unauthenticated", async () => {
    authMocks.getCurrentUser.mockResolvedValueOnce(null);

    const response = await POST(createPostRequest());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Authentication required." });
    expect(prismaMocks.transaction).not.toHaveBeenCalled();
  });

  it("returns 400 on POST for invalid input", async () => {
    authMocks.getCurrentUser.mockResolvedValueOnce(createCurrentUser());

    const response = await POST(createPostRequest(createPayload({ fullName: "   " })));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      errors: {
        fullName: "Full name is required.",
      },
    });
    expect(prismaMocks.transaction).not.toHaveBeenCalled();
  });

  it("creates a patient and owner PatientMember in one transaction", async () => {
    const createdPatient = {
      id: "patient-1",
      fullName: "Asha Rao",
      age: 72,
      relationship: "Mother",
      phoneNumber: "555-0101",
      notes: "Care notes",
      createdByUserId: "local-user-1",
    };
    authMocks.getCurrentUser.mockResolvedValueOnce(createCurrentUser());
    prismaMocks.patientCreate.mockResolvedValueOnce(createdPatient);
    prismaMocks.patientMemberCreate.mockResolvedValueOnce({
      id: "membership-1",
      patientId: "patient-1",
      userId: "local-user-1",
      role: PatientRole.PRIMARY_CAREGIVER,
    });
    prismaMocks.transaction.mockImplementationOnce((callback) =>
      callback({
        patient: { create: prismaMocks.patientCreate },
        patientMember: { create: prismaMocks.patientMemberCreate },
      }),
    );

    const response = await POST(createPostRequest());

    expect(response.status).toBe(201);
    expect(prismaMocks.transaction).toHaveBeenCalledTimes(1);
    expect(prismaMocks.patientCreate).toHaveBeenCalledWith({
      data: {
        fullName: "Asha Rao",
        age: 72,
        relationship: "Mother",
        phoneNumber: "555-0101",
        notes: "Care notes",
        createdByUserId: "local-user-1",
      },
    });
    expect(prismaMocks.patientMemberCreate).toHaveBeenCalledWith({
      data: {
        patientId: "patient-1",
        userId: "local-user-1",
        role: PatientRole.PRIMARY_CAREGIVER,
      },
    });
    expect(await response.json()).toEqual(createdPatient);
  });
});
