import type { PrismaClient } from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DOSE_STATUS } from "@/lib/dose-status";
import { processDueDosesForPatient } from "@/lib/due-dose-processing";

function createPrismaMock(processed: number) {
  return {
    doseEvent: {
      updateMany: vi.fn().mockResolvedValue({ count: processed }),
    },
  } as unknown as PrismaClient;
}

describe("processDueDosesForPatient", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not mark future PENDING doses as DUE", async () => {
    const now = new Date("2026-05-16T10:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const prisma = createPrismaMock(0);

    const result = await processDueDosesForPatient(prisma, "patient-1");

    expect(result).toEqual({
      processedAt: now.toISOString(),
      processed: 0,
    });
    expect(prisma.doseEvent.updateMany).toHaveBeenCalledWith({
      where: {
        patientId: "patient-1",
        status: DOSE_STATUS.PENDING,
        scheduledAt: { lte: now },
      },
      data: {
        status: DOSE_STATUS.DUE,
      },
    });
  });

  it("marks past PENDING doses as DUE for the requested patient only", async () => {
    const now = new Date("2026-05-16T10:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const prisma = createPrismaMock(2);

    const result = await processDueDosesForPatient(prisma, "patient-1");

    expect(result.processed).toBe(2);
    expect(prisma.doseEvent.updateMany).toHaveBeenCalledWith({
      where: {
        patientId: "patient-1",
        status: DOSE_STATUS.PENDING,
        scheduledAt: { lte: now },
      },
      data: {
        status: DOSE_STATUS.DUE,
      },
    });
  });
});
