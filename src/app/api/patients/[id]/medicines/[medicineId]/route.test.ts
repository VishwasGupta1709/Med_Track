import { afterEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => ({
  patientFindFirst: vi.fn(),
  medicineFindFirst: vi.fn(),
  medicineUpdate: vi.fn(),
  medicineTimingFindMany: vi.fn(),
  medicineTimingUpdate: vi.fn(),
  medicineTimingUpdateMany: vi.fn(),
  medicineTimingCreate: vi.fn(),
  medicineTimingDelete: vi.fn(),
  medicineTimingDeleteMany: vi.fn(),
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

import { PATCH } from "./route";

function createPayload(overrides: Record<string, unknown> = {}) {
  return {
    name: "Updated medicine",
    dosage: "500 mg",
    form: "Tablet",
    frequency: "Once daily",
    foodInstruction: "After food",
    instructions: "Care note",
    startDate: "2026-05-16",
    endDate: "2026-05-20",
    timings: [{ id: "timing-1", label: "Morning", timeOfDay: "09:00" }],
    ...overrides,
  };
}

function createRequest(body: unknown = createPayload()) {
  return new Request("http://localhost/api/patients/patient-1/medicines/medicine-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createContext(medicineId = "medicine-1") {
  return {
    params: Promise.resolve({ id: "patient-1", medicineId }),
  };
}

function createUpdatedMedicine(overrides: Record<string, unknown> = {}) {
  return {
    id: "medicine-1",
    patientId: "patient-1",
    name: "Updated medicine",
    dosage: "500 mg",
    form: "Tablet",
    frequency: "Once daily",
    foodInstruction: "After food",
    instructions: "Care note",
    status: "ACTIVE",
    startDate: new Date("2026-05-16T00:00:00.000Z"),
    endDate: new Date("2026-05-20T00:00:00.000Z"),
    timings: [{ id: "timing-1", medicineId: "medicine-1", label: "Morning", timeOfDay: "09:00" }],
    ...overrides,
  };
}

function mockTransaction() {
  prismaMocks.transaction.mockImplementation(
    async (
      callback: (tx: {
        medicine: { update: typeof prismaMocks.medicineUpdate };
        medicineTiming: {
          findMany: typeof prismaMocks.medicineTimingFindMany;
          update: typeof prismaMocks.medicineTimingUpdate;
          updateMany: typeof prismaMocks.medicineTimingUpdateMany;
          create: typeof prismaMocks.medicineTimingCreate;
          delete: typeof prismaMocks.medicineTimingDelete;
          deleteMany: typeof prismaMocks.medicineTimingDeleteMany;
        };
        doseEvent: { deleteMany: typeof prismaMocks.doseEventDeleteMany };
      }) => Promise<unknown>,
    ) =>
      callback({
        medicine: { update: prismaMocks.medicineUpdate },
        medicineTiming: {
          findMany: prismaMocks.medicineTimingFindMany,
          update: prismaMocks.medicineTimingUpdate,
          updateMany: prismaMocks.medicineTimingUpdateMany,
          create: prismaMocks.medicineTimingCreate,
          delete: prismaMocks.medicineTimingDelete,
          deleteMany: prismaMocks.medicineTimingDeleteMany,
        },
        doseEvent: { deleteMany: prismaMocks.doseEventDeleteMany },
      }),
  );
}

function mockSuccessfulEdit(updatedMedicine = createUpdatedMedicine(), deletedCount = 2) {
  mockTransaction();
  prismaMocks.patientFindFirst.mockResolvedValueOnce({ id: "patient-1" });
  prismaMocks.medicineFindFirst.mockResolvedValueOnce({ id: "medicine-1" });
  prismaMocks.medicineTimingFindMany.mockResolvedValueOnce([{ id: "timing-1" }]);
  prismaMocks.medicineTimingUpdate.mockResolvedValue({ id: "timing-1" });
  prismaMocks.medicineTimingCreate.mockResolvedValue({ id: "timing-2" });
  prismaMocks.doseEventDeleteMany.mockResolvedValueOnce({ count: deletedCount });
  prismaMocks.medicineUpdate.mockResolvedValueOnce(updatedMedicine);
}

describe("edit medicine route", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("returns 404 when the patient is missing or belongs to another user", async () => {
    prismaMocks.patientFindFirst.mockResolvedValueOnce(null);

    const response = await PATCH(createRequest(), createContext());

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
    expect(prismaMocks.transaction).not.toHaveBeenCalled();
  });

  it("returns 404 when the medicine is missing or belongs to another patient", async () => {
    prismaMocks.patientFindFirst.mockResolvedValueOnce({ id: "patient-1" });
    prismaMocks.medicineFindFirst.mockResolvedValueOnce(null);

    const response = await PATCH(createRequest(), createContext());

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Medicine not found." });
    expect(prismaMocks.medicineFindFirst).toHaveBeenCalledWith({
      where: {
        id: "medicine-1",
        patientId: "patient-1",
      },
      select: { id: true },
    });
    expect(prismaMocks.transaction).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid medicine input", async () => {
    prismaMocks.patientFindFirst.mockResolvedValueOnce({ id: "patient-1" });
    prismaMocks.medicineFindFirst.mockResolvedValueOnce({ id: "medicine-1" });

    const response = await PATCH(
      createRequest(createPayload({ name: "", timings: [{ timeOfDay: "morning" }] })),
      createContext(),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      errors: {
        name: "Medicine name is required.",
        timings: "Each timing must use HH:mm format.",
      },
    });
    expect(prismaMocks.transaction).not.toHaveBeenCalled();
  });

  it("returns 400 when frequency and timing count do not match", async () => {
    prismaMocks.patientFindFirst.mockResolvedValueOnce({ id: "patient-1" });
    prismaMocks.medicineFindFirst.mockResolvedValueOnce({ id: "medicine-1" });

    const response = await PATCH(
      createRequest(createPayload({ frequency: "2", timings: [{ timeOfDay: "09:00" }] })),
      createContext(),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      errors: {
        timings: "Frequency is 2 times daily, so please add exactly 2 timings.",
      },
    });
    expect(prismaMocks.transaction).not.toHaveBeenCalled();
  });

  it("updates scalar medicine fields without changing status", async () => {
    mockSuccessfulEdit();

    const response = await PATCH(createRequest(), createContext());

    expect(response.status).toBe(200);
    expect(prismaMocks.medicineUpdate).toHaveBeenCalledWith({
      where: { id: "medicine-1" },
      data: {
        name: "Updated medicine",
        dosage: "500 mg",
        form: "Tablet",
        frequency: "Once daily",
        foodInstruction: "After food",
        instructions: "Care note",
        startDate: new Date("2026-05-16T00:00:00.000Z"),
        endDate: new Date("2026-05-20T00:00:00.000Z"),
      },
      include: {
        timings: {
          where: { removedAt: null },
          orderBy: { timeOfDay: "asc" },
        },
      },
    });
    expect(prismaMocks.medicineUpdate.mock.calls[0][0].data).not.toHaveProperty("status");
  });

  it("updates an existing timing row in place", async () => {
    mockSuccessfulEdit();

    await PATCH(createRequest(), createContext());

    expect(prismaMocks.medicineTimingUpdate).toHaveBeenCalledWith({
      where: { id: "timing-1" },
      data: {
        label: "Morning",
        timeOfDay: "09:00",
      },
    });
  });

  it("creates a new timing row when no timing id is provided", async () => {
    mockSuccessfulEdit(createUpdatedMedicine({ timings: [] }));

    await PATCH(
      createRequest(
        createPayload({
          frequency: "2",
          timings: [
            { id: "timing-1", label: "Morning", timeOfDay: "09:00" },
            { label: "Night", timeOfDay: "21:00" },
          ],
        }),
      ),
      createContext(),
    );

    expect(prismaMocks.medicineTimingCreate).toHaveBeenCalledWith({
      data: {
        medicineId: "medicine-1",
        label: "Night",
        timeOfDay: "21:00",
        removedAt: null,
      },
    });
  });

  it("rejects a timing id that does not belong to the medicine", async () => {
    mockTransaction();
    prismaMocks.patientFindFirst.mockResolvedValueOnce({ id: "patient-1" });
    prismaMocks.medicineFindFirst.mockResolvedValueOnce({ id: "medicine-1" });
    prismaMocks.medicineTimingFindMany.mockResolvedValueOnce([]);

    const response = await PATCH(createRequest(), createContext());

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      errors: {
        timings: "One or more timings do not belong to this medicine.",
      },
    });
    expect(prismaMocks.medicineTimingUpdate).not.toHaveBeenCalled();
    expect(prismaMocks.medicineTimingCreate).not.toHaveBeenCalled();
    expect(prismaMocks.doseEventDeleteMany).not.toHaveBeenCalled();
    expect(prismaMocks.medicineUpdate).not.toHaveBeenCalled();
  });

  it("accepts removedTimingIds and soft-removes removed persisted timings", async () => {
    const now = new Date("2026-05-17T10:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);
    mockTransaction();
    prismaMocks.patientFindFirst.mockResolvedValueOnce({ id: "patient-1" });
    prismaMocks.medicineFindFirst.mockResolvedValueOnce({ id: "medicine-1" });
    prismaMocks.medicineTimingFindMany
      .mockResolvedValueOnce([{ id: "timing-1" }, { id: "timing-2" }])
      .mockResolvedValueOnce([{ id: "timing-3" }]);
    prismaMocks.medicineTimingUpdate.mockResolvedValue({ id: "timing-1" });
    prismaMocks.medicineTimingUpdateMany.mockResolvedValueOnce({ count: 1 });
    prismaMocks.doseEventDeleteMany
      .mockResolvedValueOnce({ count: 4 })
      .mockResolvedValueOnce({ count: 2 });
    prismaMocks.medicineUpdate.mockResolvedValueOnce(
      createUpdatedMedicine({
        frequency: "2",
        timings: [
          { id: "timing-1", medicineId: "medicine-1", label: "Morning", timeOfDay: "09:00" },
          { id: "timing-2", medicineId: "medicine-1", label: "Night", timeOfDay: "21:00" },
        ],
      }),
    );

    const response = await PATCH(
      createRequest(
        createPayload({
          frequency: "2",
          timings: [
            { id: "timing-1", label: "Morning", timeOfDay: "09:00" },
            { id: "timing-2", label: "Night", timeOfDay: "21:00" },
          ],
          removedTimingIds: ["timing-3"],
        }),
      ),
      createContext(),
    );

    expect(response.status).toBe(200);
    expect(prismaMocks.medicineTimingFindMany).toHaveBeenNthCalledWith(1, {
      where: {
        id: { in: ["timing-1", "timing-2"] },
        medicineId: "medicine-1",
        removedAt: null,
      },
      select: { id: true },
    });
    expect(prismaMocks.medicineTimingFindMany).toHaveBeenNthCalledWith(2, {
      where: {
        id: { in: ["timing-3"] },
        medicineId: "medicine-1",
      },
      select: { id: true },
    });
    expect(prismaMocks.medicineTimingUpdateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["timing-3"] },
        medicineId: "medicine-1",
      },
      data: {
        removedAt: now,
      },
    });
  });

  it("rejects a removed timing id that does not belong to the medicine", async () => {
    mockTransaction();
    prismaMocks.patientFindFirst.mockResolvedValueOnce({ id: "patient-1" });
    prismaMocks.medicineFindFirst.mockResolvedValueOnce({ id: "medicine-1" });
    prismaMocks.medicineTimingFindMany
      .mockResolvedValueOnce([{ id: "timing-1" }, { id: "timing-2" }])
      .mockResolvedValueOnce([]);

    const response = await PATCH(
      createRequest(
        createPayload({
          frequency: "2",
          timings: [
            { id: "timing-1", label: "Morning", timeOfDay: "09:00" },
            { id: "timing-2", label: "Night", timeOfDay: "21:00" },
          ],
          removedTimingIds: ["other-timing"],
        }),
      ),
      createContext(),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      errors: {
        timings: "One or more removed timings do not belong to this medicine.",
      },
    });
    expect(prismaMocks.medicineTimingUpdateMany).not.toHaveBeenCalled();
    expect(prismaMocks.doseEventDeleteMany).not.toHaveBeenCalled();
    expect(prismaMocks.medicineUpdate).not.toHaveBeenCalled();
  });

  it("rejects a timing id that is both active and removed", async () => {
    prismaMocks.patientFindFirst.mockResolvedValueOnce({ id: "patient-1" });
    prismaMocks.medicineFindFirst.mockResolvedValueOnce({ id: "medicine-1" });

    const response = await PATCH(
      createRequest(
        createPayload({
          timings: [{ id: "timing-1", label: "Morning", timeOfDay: "09:00" }],
          removedTimingIds: ["timing-1"],
        }),
      ),
      createContext(),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      errors: {
        timings: "A removed timing cannot also be submitted as active.",
      },
    });
    expect(prismaMocks.transaction).not.toHaveBeenCalled();
  });

  it("validates frequency against final active timing count after removal", async () => {
    prismaMocks.patientFindFirst.mockResolvedValueOnce({ id: "patient-1" });
    prismaMocks.medicineFindFirst.mockResolvedValueOnce({ id: "medicine-1" });

    const response = await PATCH(
      createRequest(
        createPayload({
          frequency: "2",
          timings: [{ id: "timing-1", label: "Morning", timeOfDay: "09:00" }],
          removedTimingIds: ["timing-2"],
        }),
      ),
      createContext(),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      errors: {
        timings: "Frequency is 2 times daily, so please add exactly 2 timings.",
      },
    });
    expect(prismaMocks.transaction).not.toHaveBeenCalled();
  });

  it("does not delete timing rows", async () => {
    mockSuccessfulEdit();

    await PATCH(createRequest(), createContext());

    expect(prismaMocks.medicineTimingDelete).not.toHaveBeenCalled();
    expect(prismaMocks.medicineTimingDeleteMany).not.toHaveBeenCalled();
  });

  it("deletes future PENDING dose events for removed timing ids", async () => {
    const now = new Date("2026-05-17T10:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);
    mockTransaction();
    prismaMocks.patientFindFirst.mockResolvedValueOnce({ id: "patient-1" });
    prismaMocks.medicineFindFirst.mockResolvedValueOnce({ id: "medicine-1" });
    prismaMocks.medicineTimingFindMany
      .mockResolvedValueOnce([{ id: "timing-1" }, { id: "timing-2" }])
      .mockResolvedValueOnce([{ id: "timing-3" }]);
    prismaMocks.medicineTimingUpdate.mockResolvedValue({ id: "timing-1" });
    prismaMocks.medicineTimingUpdateMany.mockResolvedValueOnce({ count: 1 });
    prismaMocks.doseEventDeleteMany
      .mockResolvedValueOnce({ count: 4 })
      .mockResolvedValueOnce({ count: 2 });
    prismaMocks.medicineUpdate.mockResolvedValueOnce(createUpdatedMedicine());

    await PATCH(
      createRequest(
        createPayload({
          frequency: "2",
          timings: [
            { id: "timing-1", label: "Morning", timeOfDay: "09:00" },
            { id: "timing-2", label: "Night", timeOfDay: "21:00" },
          ],
          removedTimingIds: ["timing-3"],
        }),
      ),
      createContext(),
    );

    expect(prismaMocks.doseEventDeleteMany).toHaveBeenNthCalledWith(1, {
      where: {
        medicineId: "medicine-1",
        medicineTimingId: { in: ["timing-3"] },
        scheduledAt: {
          gt: now,
        },
        status: "PENDING",
      },
    });
    expect(prismaMocks.doseEventDeleteMany.mock.calls[0][0].where.status).not.toEqual(
      expect.arrayContaining(["DUE", "TAKEN", "SKIPPED", "MISSED", "LATE"]),
    );
  });

  it("deletes only future PENDING dose events for this medicine", async () => {
    const now = new Date("2026-05-17T10:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);
    mockSuccessfulEdit();

    const response = await PATCH(createRequest(), createContext());

    expect(response.status).toBe(200);
    expect(prismaMocks.doseEventDeleteMany).toHaveBeenCalledWith({
      where: {
        medicineId: "medicine-1",
        scheduledAt: {
          gte: now,
        },
        status: "PENDING",
      },
    });
    expect(await response.json()).toEqual({
      medicine: {
        ...createUpdatedMedicine(),
        startDate: "2026-05-16T00:00:00.000Z",
        endDate: "2026-05-20T00:00:00.000Z",
      },
      deletedFuturePendingDoseEvents: 2,
    });
  });

  it("does not delete DUE, TAKEN, SKIPPED, MISSED, or LATE dose events", async () => {
    mockSuccessfulEdit();

    await PATCH(createRequest(), createContext());

    expect(prismaMocks.doseEventDeleteMany.mock.calls[0][0].where.status).toBe("PENDING");
    expect(prismaMocks.doseEventDeleteMany.mock.calls[0][0].where.status).not.toEqual(
      expect.arrayContaining(["DUE", "TAKEN", "SKIPPED", "MISSED", "LATE"]),
    );
  });
});
