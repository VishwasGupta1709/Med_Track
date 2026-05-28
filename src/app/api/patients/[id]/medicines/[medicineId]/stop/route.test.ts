import { PatientRole } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DOSE_STATUS } from "@/lib/dose-status";

const prismaMocks = vi.hoisted(() => ({
  patientFindFirst: vi.fn(),
  medicineFindFirst: vi.fn(),
  medicineUpdate: vi.fn(),
  doseEventDeleteMany: vi.fn(),
  transaction: vi.fn(),
}));

const authMocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getPatientMembership: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    patient: {
      findFirst: prismaMocks.patientFindFirst,
    },
    medicine: {
      findFirst: prismaMocks.medicineFindFirst,
    },
    $transaction: prismaMocks.transaction,
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

function createRequest() {
  return new Request("http://localhost/api/patients/patient-1/medicines/medicine-1/stop", {
    method: "POST",
  });
}

function createContext(medicineId = "medicine-1") {
  return {
    params: Promise.resolve({ id: "patient-1", medicineId }),
  };
}

function mockTransaction() {
  prismaMocks.transaction.mockImplementation(
    async (
      callback: (tx: {
        medicine: { update: typeof prismaMocks.medicineUpdate };
        doseEvent: { deleteMany: typeof prismaMocks.doseEventDeleteMany };
      }) => Promise<unknown>,
    ) =>
      callback({
        medicine: { update: prismaMocks.medicineUpdate },
        doseEvent: { deleteMany: prismaMocks.doseEventDeleteMany },
      }),
  );
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

describe("stop medicine route", () => {
  beforeEach(() => {
    mockSignedInUser();
    mockMembership(PatientRole.PRIMARY_CAREGIVER);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("returns 401 when the request is unauthenticated", async () => {
    authMocks.getCurrentUser.mockResolvedValueOnce(null);

    const response = await POST(createRequest(), createContext());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Authentication required." });
    expect(authMocks.getPatientMembership).not.toHaveBeenCalled();
    expect(prismaMocks.medicineFindFirst).not.toHaveBeenCalled();
  });

  it("returns 404 when the signed-in user is not a patient member", async () => {
    authMocks.getPatientMembership.mockResolvedValueOnce(null);

    const response = await POST(createRequest(), createContext());

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Patient not found." });
    expect(prismaMocks.medicineFindFirst).not.toHaveBeenCalled();
  });

  it.each([PatientRole.CAREGIVER, PatientRole.VIEWER])(
    "returns 403 when %s tries to stop medicine",
    async (role) => {
      mockMembership(role);

      const response = await POST(createRequest(), createContext());

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: "Forbidden." });
      expect(prismaMocks.medicineFindFirst).not.toHaveBeenCalled();
      expect(prismaMocks.transaction).not.toHaveBeenCalled();
    },
  );

  it("returns 404 when the medicine is missing or belongs to another patient", async () => {
    prismaMocks.medicineFindFirst.mockResolvedValueOnce(null);

    const response = await POST(createRequest(), createContext());

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Medicine not found." });
    expect(prismaMocks.medicineFindFirst).toHaveBeenCalledWith({
      where: {
        id: "medicine-1",
        patientId: "patient-1",
      },
      select: {
        id: true,
        endDate: true,
      },
    });
  });

  it("returns the stopped medicine and removed future dose event count", async () => {
    const stoppedAt = new Date("2026-05-16T10:00:00.000Z");
    const stoppedMedicine = {
      id: "medicine-1",
      status: "STOPPED",
      endDate: stoppedAt,
    };

    vi.useFakeTimers();
    vi.setSystemTime(stoppedAt);
    mockTransaction();
    prismaMocks.medicineFindFirst.mockResolvedValueOnce({ id: "medicine-1", endDate: null });
    prismaMocks.medicineUpdate.mockResolvedValueOnce(stoppedMedicine);
    prismaMocks.doseEventDeleteMany.mockResolvedValueOnce({ count: 2 });

    const response = await POST(createRequest(), createContext());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      medicine: {
        ...stoppedMedicine,
        endDate: stoppedAt.toISOString(),
      },
      removedFutureDoseEvents: 2,
    });
    expect(prismaMocks.medicineUpdate).toHaveBeenCalledWith({
      where: { id: "medicine-1" },
      data: {
        status: "STOPPED",
        endDate: stoppedAt,
      },
    });
    expect(prismaMocks.doseEventDeleteMany).toHaveBeenCalledWith({
      where: {
        medicineId: "medicine-1",
        scheduledAt: { gt: stoppedAt },
        status: { in: [DOSE_STATUS.PENDING] },
      },
    });
  });

  it("returns success when the medicine is already stopped", async () => {
    const existingEndDate = new Date("2026-05-15T10:00:00.000Z");
    const stoppedMedicine = {
      id: "medicine-1",
      status: "STOPPED",
      endDate: existingEndDate,
    };

    mockTransaction();
    prismaMocks.medicineFindFirst.mockResolvedValueOnce({
      id: "medicine-1",
      endDate: existingEndDate,
    });
    prismaMocks.medicineUpdate.mockResolvedValueOnce(stoppedMedicine);
    prismaMocks.doseEventDeleteMany.mockResolvedValueOnce({ count: 0 });

    const response = await POST(createRequest(), createContext());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      medicine: {
        ...stoppedMedicine,
        endDate: existingEndDate.toISOString(),
      },
      removedFutureDoseEvents: 0,
    });
  });
});
