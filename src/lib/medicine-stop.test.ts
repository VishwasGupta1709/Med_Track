import type { PrismaClient } from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MEDICINE_STOPPED_STATUS,
  STOPPED_MEDICINE_CLEANUP_STATUSES,
  stopMedicine,
} from "@/lib/medicine-stop";
import { DOSE_STATUS } from "@/lib/dose-status";

function createPrismaMock() {
  const medicineUpdate = vi.fn();
  const doseEventDeleteMany = vi.fn();
  const transaction = vi.fn(
    async (
      callback: (tx: {
        medicine: { update: typeof medicineUpdate };
        doseEvent: { deleteMany: typeof doseEventDeleteMany };
      }) => Promise<unknown>,
    ) =>
      callback({
        medicine: { update: medicineUpdate },
        doseEvent: { deleteMany: doseEventDeleteMany },
      }),
  );

  return {
    prisma: { $transaction: transaction } as unknown as PrismaClient,
    medicineUpdate,
    doseEventDeleteMany,
    transaction,
  };
}

describe("stopMedicine", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("sets the medicine status to STOPPED", async () => {
    const { prisma, medicineUpdate, doseEventDeleteMany } = createPrismaMock();
    const stoppedAt = new Date("2026-05-16T10:00:00.000Z");
    const updatedMedicine = { id: "medicine-1", status: MEDICINE_STOPPED_STATUS };

    medicineUpdate.mockResolvedValueOnce(updatedMedicine);
    doseEventDeleteMany.mockResolvedValueOnce({ count: 0 });

    const result = await stopMedicine(prisma, { id: "medicine-1", endDate: null }, stoppedAt);

    expect(result.medicine).toEqual(updatedMedicine);
    expect(medicineUpdate).toHaveBeenCalledWith({
      where: { id: "medicine-1" },
      data: {
        status: MEDICINE_STOPPED_STATUS,
        endDate: stoppedAt,
      },
    });
  });

  it("sets endDate when the medicine does not have one", async () => {
    const { prisma, medicineUpdate, doseEventDeleteMany } = createPrismaMock();
    const stoppedAt = new Date("2026-05-16T10:00:00.000Z");

    medicineUpdate.mockResolvedValueOnce({ id: "medicine-1", endDate: stoppedAt });
    doseEventDeleteMany.mockResolvedValueOnce({ count: 0 });

    await stopMedicine(prisma, { id: "medicine-1", endDate: null }, stoppedAt);

    expect(medicineUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ endDate: stoppedAt }),
      }),
    );
  });

  it("preserves an existing endDate", async () => {
    const { prisma, medicineUpdate, doseEventDeleteMany } = createPrismaMock();
    const existingEndDate = new Date("2026-05-15T10:00:00.000Z");
    const stoppedAt = new Date("2026-05-16T10:00:00.000Z");

    medicineUpdate.mockResolvedValueOnce({ id: "medicine-1", endDate: existingEndDate });
    doseEventDeleteMany.mockResolvedValueOnce({ count: 0 });

    await stopMedicine(prisma, { id: "medicine-1", endDate: existingEndDate }, stoppedAt);

    const updateCall = medicineUpdate.mock.calls[0]?.[0];
    expect(updateCall.data).toEqual({ status: MEDICINE_STOPPED_STATUS });
  });

  it("keeps pending doses scheduled before the stop time", async () => {
    const { prisma, medicineUpdate, doseEventDeleteMany } = createPrismaMock();
    const stoppedAt = new Date("2026-05-16T12:00:00.000Z");

    medicineUpdate.mockResolvedValueOnce({ id: "medicine-1" });
    doseEventDeleteMany.mockResolvedValueOnce({ count: 0 });

    await stopMedicine(prisma, { id: "medicine-1", endDate: null }, stoppedAt);

    expect(doseEventDeleteMany).toHaveBeenCalledWith({
      where: {
        medicineId: "medicine-1",
        scheduledAt: { gt: stoppedAt },
        status: { in: [...STOPPED_MEDICINE_CLEANUP_STATUSES] },
      },
    });
  });

  it("deletes future pending doses scheduled after the stop time", async () => {
    const { prisma, medicineUpdate, doseEventDeleteMany } = createPrismaMock();
    const stoppedAt = new Date("2026-05-16T12:00:00.000Z");

    medicineUpdate.mockResolvedValueOnce({ id: "medicine-1" });
    doseEventDeleteMany.mockResolvedValueOnce({ count: 1 });

    const result = await stopMedicine(prisma, { id: "medicine-1", endDate: null }, stoppedAt);

    expect(result.removedFutureDoseEvents).toBe(1);
    expect(doseEventDeleteMany).toHaveBeenCalledWith({
      where: {
        medicineId: "medicine-1",
        scheduledAt: { gt: stoppedAt },
        status: { in: [DOSE_STATUS.PENDING] },
      },
    });
  });

  it.each([
    DOSE_STATUS.DUE,
    DOSE_STATUS.TAKEN,
    DOSE_STATUS.SKIPPED,
    DOSE_STATUS.MISSED,
    DOSE_STATUS.LATE,
  ])("does not target %s dose events", async (status) => {
    const { prisma, medicineUpdate, doseEventDeleteMany } = createPrismaMock();
    const stoppedAt = new Date("2026-05-16T12:00:00.000Z");

    medicineUpdate.mockResolvedValueOnce({ id: "medicine-1" });
    doseEventDeleteMany.mockResolvedValueOnce({ count: 0 });

    await stopMedicine(prisma, { id: "medicine-1", endDate: null }, stoppedAt);

    const deleteCall = doseEventDeleteMany.mock.calls[0]?.[0];
    expect(deleteCall.where.status.in).not.toContain(status);
    expect(deleteCall.where.status.in).toEqual([DOSE_STATUS.PENDING]);
  });

  it("uses the requested medicine id in cleanup", async () => {
    const { prisma, medicineUpdate, doseEventDeleteMany } = createPrismaMock();
    const stoppedAt = new Date("2026-05-16T10:00:00.000Z");

    medicineUpdate.mockResolvedValueOnce({ id: "medicine-2" });
    doseEventDeleteMany.mockResolvedValueOnce({ count: 1 });

    await stopMedicine(prisma, { id: "medicine-2", endDate: null }, stoppedAt);

    expect(doseEventDeleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ medicineId: "medicine-2" }),
      }),
    );
  });
});
