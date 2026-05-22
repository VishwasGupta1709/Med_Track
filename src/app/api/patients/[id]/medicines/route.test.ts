import { afterEach, describe, expect, it, vi } from "vitest";
import { PatientRole } from "@prisma/client";

const authMocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}));

const patientAccessMocks = vi.hoisted(() => ({
  requirePatientMembership: vi.fn(),
}));

const prismaMocks = vi.hoisted(() => ({
  medicineFindMany: vi.fn(),
  medicineCreate: vi.fn(),
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
    medicine: {
      findMany: prismaMocks.medicineFindMany,
      create: prismaMocks.medicineCreate,
    },
  },
}));

import {
  MANAGE_MEDICINE_ROLES,
  PatientAccessError,
  VIEW_PATIENT_ROLES,
} from "@/lib/auth/patient-access";
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

function createMembership(role = PatientRole.PRIMARY_CAREGIVER) {
  return {
    id: "membership-1",
    patientId: "patient-1",
    userId: "local-user-1",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

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

function createPostRequest(body: unknown = createPayload()) {
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

describe("medicine list/create route", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 on GET when unauthenticated", async () => {
    authMocks.getCurrentUser.mockResolvedValueOnce(null);

    const response = await GET(createGetRequest(), createContext());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Authentication required." });
    expect(patientAccessMocks.requirePatientMembership).not.toHaveBeenCalled();
    expect(prismaMocks.medicineFindMany).not.toHaveBeenCalled();
  });

  it("returns 404 on GET for non-members", async () => {
    authMocks.getCurrentUser.mockResolvedValueOnce(createCurrentUser());
    patientAccessMocks.requirePatientMembership.mockRejectedValueOnce(
      new PatientAccessError("Patient access required.", "PATIENT_ACCESS_REQUIRED"),
    );

    const response = await GET(createGetRequest(), createContext());

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Patient not found." });
    expect(prismaMocks.medicineFindMany).not.toHaveBeenCalled();
  });

  it.each([
    PatientRole.PRIMARY_CAREGIVER,
    PatientRole.CAREGIVER,
    PatientRole.VIEWER,
  ])("allows %s to view medicines", async (role) => {
    const medicines = [{ id: "medicine-1", patientId: "patient-1", name: "Paracetamol" }];
    authMocks.getCurrentUser.mockResolvedValueOnce(createCurrentUser());
    patientAccessMocks.requirePatientMembership.mockResolvedValueOnce(createMembership(role));
    prismaMocks.medicineFindMany.mockResolvedValueOnce(medicines);

    const response = await GET(createGetRequest(), createContext());

    expect(response.status).toBe(200);
    expect(patientAccessMocks.requirePatientMembership).toHaveBeenCalledWith(
      "patient-1",
      "local-user-1",
      VIEW_PATIENT_ROLES,
    );
    expect(prismaMocks.medicineFindMany).toHaveBeenCalledWith({
      where: { patientId: "patient-1" },
      include: {
        timings: {
          orderBy: { timeOfDay: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    expect(await response.json()).toEqual(medicines);
  });

  it("returns 401 on POST when unauthenticated", async () => {
    authMocks.getCurrentUser.mockResolvedValueOnce(null);

    const response = await POST(createPostRequest(), createContext());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Authentication required." });
    expect(prismaMocks.medicineCreate).not.toHaveBeenCalled();
  });

  it("returns 404 on POST for non-members", async () => {
    authMocks.getCurrentUser.mockResolvedValueOnce(createCurrentUser());
    patientAccessMocks.requirePatientMembership.mockRejectedValueOnce(
      new PatientAccessError("Patient access required.", "PATIENT_ACCESS_REQUIRED"),
    );

    const response = await POST(createPostRequest(), createContext());

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Patient not found." });
    expect(prismaMocks.medicineCreate).not.toHaveBeenCalled();
  });

  it.each([PatientRole.CAREGIVER, PatientRole.VIEWER])(
    "returns 403 when %s tries to create a medicine",
    async () => {
      authMocks.getCurrentUser.mockResolvedValueOnce(createCurrentUser());
      patientAccessMocks.requirePatientMembership.mockRejectedValueOnce(
        new PatientAccessError("Patient role not permitted.", "PATIENT_ROLE_REQUIRED"),
      );

      const response = await POST(createPostRequest(), createContext());

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: "Patient access forbidden." });
      expect(prismaMocks.medicineCreate).not.toHaveBeenCalled();
    },
  );

  it("rejects mismatched frequency and timing count", async () => {
    authMocks.getCurrentUser.mockResolvedValueOnce(createCurrentUser());
    patientAccessMocks.requirePatientMembership.mockResolvedValueOnce(createMembership());

    const response = await POST(
      createPostRequest(createPayload({ frequency: "2", timings: [{ timeOfDay: "09:00" }] })),
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

  it("allows PRIMARY_CAREGIVER to create a medicine", async () => {
    const medicine = {
      id: "medicine-1",
      patientId: "patient-1",
      name: "Paracetamol",
      startDate: new Date("2026-05-16T00:00:00.000Z"),
      endDate: new Date("2026-05-20T00:00:00.000Z"),
      timings: [{ id: "timing-1", label: "Morning", timeOfDay: "09:00" }],
    };
    authMocks.getCurrentUser.mockResolvedValueOnce(createCurrentUser());
    patientAccessMocks.requirePatientMembership.mockResolvedValueOnce(createMembership());
    prismaMocks.medicineCreate.mockResolvedValueOnce(medicine);

    const response = await POST(createPostRequest(), createContext());

    expect(response.status).toBe(201);
    expect(patientAccessMocks.requirePatientMembership).toHaveBeenCalledWith(
      "patient-1",
      "local-user-1",
      MANAGE_MEDICINE_ROLES,
    );
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
    expect(await response.json()).toEqual({
      ...medicine,
      startDate: medicine.startDate.toISOString(),
      endDate: medicine.endDate.toISOString(),
    });
  });
});
