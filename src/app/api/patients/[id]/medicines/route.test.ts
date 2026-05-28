import { PatientRole } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => ({
  medicineFindMany: vi.fn(),
  medicineCreate: vi.fn(),
}));

const authMocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getPatientMembership: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    medicine: {
      findMany: prismaMocks.medicineFindMany,
      create: prismaMocks.medicineCreate,
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

import { GET, POST } from "./route";

function createPayload(overrides: Record<string, unknown> = {}) {
  return {
    name: "Paracetamol",
    dosage: "500 mg",
    form: "Tablet",
    frequency: "Once daily",
    foodInstruction: "After food",
    instructions: "Care note",
    startDate: "2026-05-16",
    endDate: "2026-05-20",
    timings: [{ label: "Morning", timeOfDay: "09:00" }],
    ...overrides,
  };
}

function createRequest(body: unknown = createPayload()) {
  return new Request("http://localhost/api/patients/patient-1/medicines", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createGetRequest() {
  return new Request("http://localhost/api/patients/patient-1/medicines", {
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

describe("create medicine route", () => {
  beforeEach(() => {
    mockSignedInUser();
    mockMembership(PatientRole.PRIMARY_CAREGIVER);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it.each([PatientRole.PRIMARY_CAREGIVER, PatientRole.CAREGIVER, PatientRole.VIEWER])(
    "allows %s to list medicines",
    async (role) => {
      mockMembership(role);
      const medicines = [{ id: "medicine-1", patientId: "patient-1", timings: [] }];
      prismaMocks.medicineFindMany.mockResolvedValueOnce(medicines);

      const response = await GET(createGetRequest(), createContext());

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(medicines);
      expect(prismaMocks.medicineFindMany).toHaveBeenCalledWith({
        where: { patientId: "patient-1" },
        include: {
          timings: {
            orderBy: { timeOfDay: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    },
  );

  it.each([
    ["GET", GET, createGetRequest()],
    ["POST", POST, createRequest()],
  ] as const)("returns 401 for unauthenticated %s requests", async (_method, handler, request) => {
    authMocks.getCurrentUser.mockResolvedValueOnce(null);

    const response = await handler(request, createContext());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Authentication required." });
    expect(authMocks.getPatientMembership).not.toHaveBeenCalled();
    expect(prismaMocks.medicineFindMany).not.toHaveBeenCalled();
    expect(prismaMocks.medicineCreate).not.toHaveBeenCalled();
  });

  it.each([
    ["GET", GET, createGetRequest()],
    ["POST", POST, createRequest()],
  ] as const)("returns 404 for non-member %s requests", async (_method, handler, request) => {
    authMocks.getPatientMembership.mockResolvedValueOnce(null);

    const response = await handler(request, createContext());

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Patient not found." });
    expect(prismaMocks.medicineFindMany).not.toHaveBeenCalled();
    expect(prismaMocks.medicineCreate).not.toHaveBeenCalled();
  });

  it.each([PatientRole.CAREGIVER, PatientRole.VIEWER])(
    "returns 403 when %s tries to create medicine",
    async (role) => {
      mockMembership(role);

      const response = await POST(createRequest(), createContext());

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: "Forbidden." });
      expect(prismaMocks.medicineCreate).not.toHaveBeenCalled();
    },
  );

  it("allows PRIMARY_CAREGIVER to create medicine", async () => {
    const medicine = {
      id: "medicine-1",
      patientId: "patient-1",
      name: "Paracetamol",
      startDate: new Date("2026-05-16T00:00:00.000Z"),
      endDate: new Date("2026-05-20T00:00:00.000Z"),
      timings: [{ id: "timing-1", label: "Morning", timeOfDay: "09:00" }],
    };
    prismaMocks.medicineCreate.mockResolvedValueOnce(medicine);

    const response = await POST(createRequest(), createContext());

    expect(response.status).toBe(201);
    expect(prismaMocks.medicineCreate).toHaveBeenCalledWith({
      data: {
        patientId: "patient-1",
        name: "Paracetamol",
        dosage: "500 mg",
        form: "Tablet",
        frequency: "Once daily",
        foodInstruction: "After food",
        instructions: "Care note",
        status: "ACTIVE",
        startDate: new Date("2026-05-16T00:00:00.000Z"),
        endDate: new Date("2026-05-20T00:00:00.000Z"),
        timings: {
          create: [{ label: "Morning", timeOfDay: "09:00" }],
        },
      },
      include: {
        timings: {
          orderBy: { timeOfDay: "asc" },
        },
      },
    });
  });

  it("rejects mismatched frequency and timing count", async () => {
    const response = await POST(
      createRequest(createPayload({ frequency: "2", timings: [{ timeOfDay: "09:00" }] })),
      createContext(),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      errors: {
        timings: "Frequency is 2 times daily, so please add exactly 2 timings.",
      },
    });
    expect(prismaMocks.medicineCreate).not.toHaveBeenCalled();
  });
});
