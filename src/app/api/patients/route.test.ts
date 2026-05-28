import { PatientRole } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => ({
  patientFindMany: vi.fn(),
  patientCreate: vi.fn(),
  patientMemberCreate: vi.fn(),
  transaction: vi.fn(),
}));

const authMocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    patient: {
      findMany: prismaMocks.patientFindMany,
    },
    $transaction: prismaMocks.transaction,
  },
}));

vi.mock("@/lib/auth/current-user", () => ({
  getCurrentUser: authMocks.getCurrentUser,
}));

import { GET, POST } from "./route";

function createPayload(overrides: Record<string, unknown> = {}) {
  return {
    fullName: "Asha Rao",
    age: "72",
    relationship: "Mother",
    phoneNumber: "5551234567",
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

function mockSignedInUser() {
  authMocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
}

function mockTransaction() {
  prismaMocks.transaction.mockImplementation(
    async (
      callback: (tx: {
        patient: { create: typeof prismaMocks.patientCreate };
        patientMember: { create: typeof prismaMocks.patientMemberCreate };
      }) => Promise<unknown>,
    ) =>
      callback({
        patient: { create: prismaMocks.patientCreate },
        patientMember: { create: prismaMocks.patientMemberCreate },
      }),
  );
}

describe("patients route", () => {
  beforeEach(() => {
    mockSignedInUser();
    mockTransaction();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 on GET when the request is unauthenticated", async () => {
    authMocks.getCurrentUser.mockResolvedValueOnce(null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Authentication required." });
    expect(prismaMocks.patientFindMany).not.toHaveBeenCalled();
  });

  it("lists only patients where the signed-in user has a PatientMember row", async () => {
    const patients = [
      {
        id: "patient-1",
        fullName: "Asha Rao",
        createdAt: new Date("2026-05-16T10:30:00.000Z"),
      },
    ];
    prismaMocks.patientFindMany.mockResolvedValueOnce(patients);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(prismaMocks.patientFindMany).toHaveBeenCalledWith({
      where: {
        members: {
          some: {
            userId: "user-1",
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    expect(await response.json()).toEqual([
      {
        ...patients[0],
        createdAt: patients[0].createdAt.toISOString(),
      },
    ]);
  });

  it("excludes patients not joined through PatientMember by using membership-backed filtering", async () => {
    prismaMocks.patientFindMany.mockResolvedValueOnce([]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
    expect(prismaMocks.patientFindMany.mock.calls[0][0].where).toEqual({
      members: {
        some: {
          userId: "user-1",
        },
      },
    });
  });

  it("returns 401 on POST when the request is unauthenticated", async () => {
    authMocks.getCurrentUser.mockResolvedValueOnce(null);

    const response = await POST(createPostRequest());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Authentication required." });
    expect(prismaMocks.transaction).not.toHaveBeenCalled();
  });

  it("returns 400 on POST for invalid patient input", async () => {
    const response = await POST(createPostRequest(createPayload({ fullName: "" })));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      errors: {
        fullName: "Full name is required.",
      },
    });
    expect(prismaMocks.transaction).not.toHaveBeenCalled();
  });

  it("creates a patient and PRIMARY_CAREGIVER PatientMember in one transaction", async () => {
    const createdPatient = {
      id: "patient-1",
      fullName: "Asha Rao",
      age: 72,
      relationship: "Mother",
      phoneNumber: "5551234567",
      notes: "Care notes",
      createdByUserId: "user-1",
      createdAt: new Date("2026-05-16T10:30:00.000Z"),
    };
    prismaMocks.patientCreate.mockResolvedValueOnce(createdPatient);
    prismaMocks.patientMemberCreate.mockResolvedValueOnce({
      id: "membership-1",
      patientId: "patient-1",
      userId: "user-1",
      role: PatientRole.PRIMARY_CAREGIVER,
    });

    const response = await POST(createPostRequest());

    expect(response.status).toBe(201);
    expect(prismaMocks.transaction).toHaveBeenCalledTimes(1);
    expect(prismaMocks.patientCreate).toHaveBeenCalledWith({
      data: {
        fullName: "Asha Rao",
        age: 72,
        relationship: "Mother",
        phoneNumber: "5551234567",
        notes: "Care notes",
        createdByUserId: "user-1",
      },
    });
    expect(prismaMocks.patientMemberCreate).toHaveBeenCalledWith({
      data: {
        patientId: "patient-1",
        userId: "user-1",
        role: PatientRole.PRIMARY_CAREGIVER,
      },
    });
    expect(await response.json()).toEqual({
      ...createdPatient,
      createdAt: createdPatient.createdAt.toISOString(),
    });
  });
});
