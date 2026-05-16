import { afterEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => ({
  patientFindFirst: vi.fn(),
  medicineFindFirst: vi.fn(),
  medicineUpdate: vi.fn(),
  doseEventDeleteMany: vi.fn(),
  transaction: vi.fn(),
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

describe("stop medicine route", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("returns 404 when the patient is missing or belongs to another user", async () => {
    prismaMocks.patientFindFirst.mockResolvedValueOnce(null);

    const response = await POST(createRequest(), createContext());

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Patient not found." });
    expect(prismaMocks.patientFindFirst).toHaveBeenCalledWith({
      where: {
        id: "patient-1",
        createdByUserId: "demo-user",
      },
      select: { id: true },
    });
    expect(prismaMocks.medicineFindFirst).not.toHaveBeenCalled();
  });

  it("returns 404 when the medicine is missing or belongs to another patient", async () => {
    prismaMocks.patientFindFirst.mockResolvedValueOnce({ id: "patient-1" });
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

  it("uses the demo-user ownership lookup before mutation", async () => {
    prismaMocks.patientFindFirst.mockResolvedValueOnce(null);

    await POST(createRequest(), createContext());

    expect(prismaMocks.patientFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "patient-1",
          createdByUserId: "demo-user",
        },
      }),
    );
    expect(prismaMocks.transaction).not.toHaveBeenCalled();
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
    prismaMocks.patientFindFirst.mockResolvedValueOnce({ id: "patient-1" });
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
  });

  it("returns success when the medicine is already stopped", async () => {
    const existingEndDate = new Date("2026-05-15T10:00:00.000Z");
    const stoppedMedicine = {
      id: "medicine-1",
      status: "STOPPED",
      endDate: existingEndDate,
    };

    mockTransaction();
    prismaMocks.patientFindFirst.mockResolvedValueOnce({ id: "patient-1" });
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
