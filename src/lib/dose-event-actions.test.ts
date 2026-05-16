import type { PrismaClient } from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DOSE_STATUS } from "@/lib/dose-status";
import { confirmDoseEventAction, skipDoseEventAction } from "@/lib/dose-event-actions";

type DoseActionUpdateArgs = {
  where: {
    id: string;
    status: { in: string[] };
    takenAt: null;
    skippedAt: null;
    missedAt: null;
  };
  data: Record<string, unknown>;
};

function createPrismaMock(currentStatus: string, doseEventId = "dose-1") {
  const updateMany = vi.fn(async (args: DoseActionUpdateArgs) => ({
    count:
      args.where.id === doseEventId &&
      args.where.status.in.includes(currentStatus) &&
      args.where.takenAt === null &&
      args.where.skippedAt === null &&
      args.where.missedAt === null
        ? 1
        : 0,
  }));

  const prisma = {
    doseEvent: {
      updateMany,
    },
  } as unknown as PrismaClient;

  return { prisma, updateMany };
}

describe("dose event actions", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([DOSE_STATUS.PENDING, DOSE_STATUS.DUE])(
    "%s dose can be confirmed as TAKEN",
    async (status) => {
      const now = new Date("2026-05-16T10:00:00.000Z");
      vi.useFakeTimers();
      vi.setSystemTime(now);
      const { prisma, updateMany } = createPrismaMock(status);

      const result = await confirmDoseEventAction(prisma, "dose-1", "demo-user", {
        confirmationNote: "Taken after breakfast",
      });

      expect(result).toEqual({ updated: true, count: 1 });
      expect(updateMany).toHaveBeenCalledWith({
        where: {
          id: "dose-1",
          status: { in: [DOSE_STATUS.PENDING, DOSE_STATUS.DUE] },
          takenAt: null,
          skippedAt: null,
          missedAt: null,
        },
        data: {
          status: DOSE_STATUS.TAKEN,
          takenAt: now,
          skippedAt: null,
          missedAt: null,
          skippedReason: null,
          confirmedByUserId: "demo-user",
          confirmationNote: "Taken after breakfast",
        },
      });
    },
  );

  it.each([DOSE_STATUS.PENDING, DOSE_STATUS.DUE])(
    "%s dose can be skipped as SKIPPED",
    async (status) => {
      const now = new Date("2026-05-16T10:00:00.000Z");
      vi.useFakeTimers();
      vi.setSystemTime(now);
      const { prisma, updateMany } = createPrismaMock(status);

      const result = await skipDoseEventAction(prisma, "dose-1", "demo-user", {
        skippedReason: "Caregiver chose to skip",
        confirmationNote: "Family informed",
      });

      expect(result).toEqual({ updated: true, count: 1 });
      expect(updateMany).toHaveBeenCalledWith({
        where: {
          id: "dose-1",
          status: { in: [DOSE_STATUS.PENDING, DOSE_STATUS.DUE] },
          takenAt: null,
          skippedAt: null,
          missedAt: null,
        },
        data: {
          status: DOSE_STATUS.SKIPPED,
          skippedAt: now,
          takenAt: null,
          missedAt: null,
          confirmedByUserId: "demo-user",
          skippedReason: "Caregiver chose to skip",
          confirmationNote: "Family informed",
        },
      });
    },
  );

  it.each([DOSE_STATUS.TAKEN, DOSE_STATUS.SKIPPED, DOSE_STATUS.MISSED])(
    "%s dose cannot be confirmed",
    async (status) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-05-16T10:00:00.000Z"));
      const { prisma } = createPrismaMock(status);

      const result = await confirmDoseEventAction(prisma, "dose-1", "demo-user", {
        confirmationNote: "Already final",
      });

      expect(result).toEqual({ updated: false, count: 0 });
    },
  );

  it.each([DOSE_STATUS.TAKEN, DOSE_STATUS.SKIPPED, DOSE_STATUS.MISSED])(
    "%s dose cannot be skipped",
    async (status) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-05-16T10:00:00.000Z"));
      const { prisma } = createPrismaMock(status);

      const result = await skipDoseEventAction(prisma, "dose-1", "demo-user", {
        skippedReason: "Already final",
      });

      expect(result).toEqual({ updated: false, count: 0 });
    },
  );

  it("targets only the requested dose event id", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-16T10:00:00.000Z"));
    const { prisma, updateMany } = createPrismaMock(DOSE_STATUS.PENDING, "different-dose");

    const result = await confirmDoseEventAction(prisma, "dose-1", "demo-user", {});

    expect(result).toEqual({ updated: false, count: 0 });
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "dose-1",
        }),
      }),
    );
  });
});
