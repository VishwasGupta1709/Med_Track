import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { ACTIONABLE_DOSE_STATUSES, DOSE_STATUS } from "@/lib/dose-status";
import { refreshTodayScheduleStatusesForPatient } from "@/lib/today-schedule-status-processing";

function createPrismaMock(missedCount = 0, dueCount = 0) {
  const updateMany = vi
    .fn()
    .mockResolvedValueOnce({ count: missedCount })
    .mockResolvedValueOnce({ count: dueCount });

  return {
    prisma: {
      doseEvent: {
        updateMany,
      },
    } as unknown as PrismaClient,
    updateMany,
  };
}

describe("refreshTodayScheduleStatusesForPatient", () => {
  it("marks a 9:26 AM pending dose as missed at 2:29 PM", async () => {
    const now = new Date("2026-05-16T14:29:00.000Z");
    const cutoffAt = new Date("2026-05-16T13:59:00.000Z");
    const { prisma, updateMany } = createPrismaMock(1, 0);

    const result = await refreshTodayScheduleStatusesForPatient(prisma, "patient-1", now);

    expect(result).toEqual({
      processedAt: now.toISOString(),
      cutoffMinutes: 30,
      cutoffAt: cutoffAt.toISOString(),
      missed: 1,
      due: 0,
    });
    expect(updateMany).toHaveBeenNthCalledWith(1, {
      where: {
        patientId: "patient-1",
        medicine: {
          patientId: "patient-1",
        },
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

  it("marks pending doses within the missed cutoff as due", async () => {
    const now = new Date("2026-05-16T14:29:00.000Z");
    const cutoffAt = new Date("2026-05-16T13:59:00.000Z");
    const { prisma, updateMany } = createPrismaMock(0, 1);

    const result = await refreshTodayScheduleStatusesForPatient(prisma, "patient-1", now);

    expect(result.due).toBe(1);
    expect(updateMany).toHaveBeenNthCalledWith(2, {
      where: {
        patientId: "patient-1",
        medicine: {
          patientId: "patient-1",
        },
        status: DOSE_STATUS.PENDING,
        scheduledAt: {
          gt: cutoffAt,
          lte: now,
        },
      },
      data: {
        status: DOSE_STATUS.DUE,
      },
    });
  });

  it("does not target future pending doses", async () => {
    const now = new Date("2026-05-16T14:29:00.000Z");
    const { prisma, updateMany } = createPrismaMock();

    await refreshTodayScheduleStatusesForPatient(prisma, "patient-1", now);

    const dueWhere = updateMany.mock.calls[1]?.[0].where;
    expect(dueWhere.scheduledAt).toEqual({
      gt: new Date("2026-05-16T13:59:00.000Z"),
      lte: now,
    });
  });

  it.each([
    DOSE_STATUS.TAKEN,
    DOSE_STATUS.SKIPPED,
    DOSE_STATUS.MISSED,
    DOSE_STATUS.LATE,
  ])("does not rewrite %s doses", async (status) => {
    const now = new Date("2026-05-16T14:29:00.000Z");
    const { prisma, updateMany } = createPrismaMock();

    await refreshTodayScheduleStatusesForPatient(prisma, "patient-1", now);

    const missedWhere = updateMany.mock.calls[0]?.[0].where;
    const dueWhere = updateMany.mock.calls[1]?.[0].where;
    expect(missedWhere.status.in).not.toContain(status);
    expect(dueWhere.status).not.toBe(status);
  });

  it("scopes processing to the requested patient and the patient's medicine", async () => {
    const now = new Date("2026-05-16T14:29:00.000Z");
    const { prisma, updateMany } = createPrismaMock();

    await refreshTodayScheduleStatusesForPatient(prisma, "patient-1", now);

    expect(updateMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          patientId: "patient-1",
          medicine: {
            patientId: "patient-1",
          },
        }),
      }),
    );
    expect(updateMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          patientId: "patient-1",
          medicine: {
            patientId: "patient-1",
          },
        }),
      }),
    );
  });

  it("processes missed doses before due doses", async () => {
    const now = new Date("2026-05-16T14:29:00.000Z");
    const { prisma, updateMany } = createPrismaMock(1, 1);

    await refreshTodayScheduleStatusesForPatient(prisma, "patient-1", now);

    expect(updateMany.mock.calls[0]?.[0].data.status).toBe(DOSE_STATUS.MISSED);
    expect(updateMany.mock.calls[1]?.[0].data.status).toBe(DOSE_STATUS.DUE);
  });
});
