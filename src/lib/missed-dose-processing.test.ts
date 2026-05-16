import type { PrismaClient } from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ACTIONABLE_DOSE_STATUSES, DOSE_STATUS } from "@/lib/dose-status";
import { processMissedDosesForPatient } from "@/lib/missed-dose-processing";

function createPrismaMock(processed: number) {
  return {
    doseEvent: {
      updateMany: vi.fn().mockResolvedValue({ count: processed }),
    },
  } as unknown as PrismaClient;
}

describe("processMissedDosesForPatient", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("marks PENDING or DUE doses older than the missed cutoff as MISSED", async () => {
    const now = new Date("2026-05-16T10:00:00.000Z");
    const cutoffAt = new Date("2026-05-16T09:30:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const prisma = createPrismaMock(2);

    const result = await processMissedDosesForPatient(prisma, "patient-1");

    expect(result).toEqual({
      cutoffMinutes: 30,
      cutoffAt: cutoffAt.toISOString(),
      processed: 2,
    });
    expect(prisma.doseEvent.updateMany).toHaveBeenCalledWith({
      where: {
        patientId: "patient-1",
        status: { in: [...ACTIONABLE_DOSE_STATUSES] },
        takenAt: null,
        skippedAt: null,
        missedAt: null,
        scheduledAt: { lte: cutoffAt },
      },
      data: {
        status: DOSE_STATUS.MISSED,
        missedAt: now,
      },
    });
  });

  it("does not change TAKEN, SKIPPED, or MISSED terminal dose events", async () => {
    const now = new Date("2026-05-16T10:00:00.000Z");
    const cutoffAt = new Date("2026-05-16T09:30:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const prisma = createPrismaMock(0);

    const result = await processMissedDosesForPatient(prisma, "patient-1");

    expect(result.processed).toBe(0);
    expect(prisma.doseEvent.updateMany).toHaveBeenCalledWith({
      where: {
        patientId: "patient-1",
        status: { in: [DOSE_STATUS.PENDING, DOSE_STATUS.DUE] },
        takenAt: null,
        skippedAt: null,
        missedAt: null,
        scheduledAt: { lte: cutoffAt },
      },
      data: {
        status: DOSE_STATUS.MISSED,
        missedAt: now,
      },
    });
  });

  it("does not touch dose events from another patient", async () => {
    const now = new Date("2026-05-16T10:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const prisma = createPrismaMock(1);

    await processMissedDosesForPatient(prisma, "patient-1");

    expect(prisma.doseEvent.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          patientId: "patient-1",
        }),
      }),
    );
  });
});
