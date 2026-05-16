import type { PrismaClient } from "@prisma/client";
import { ACTIONABLE_DOSE_STATUSES, DOSE_STATUS } from "@/lib/dose-status";
import type { DoseEventActionInput } from "@/lib/dose-event-validation";

export type DoseEventActionResult = {
  updated: boolean;
  count: number;
};

export async function confirmDoseEventAction(
  prisma: PrismaClient,
  doseEventId: string,
  confirmedByUserId: string,
  input: DoseEventActionInput,
): Promise<DoseEventActionResult> {
  const result = await prisma.doseEvent.updateMany({
    where: {
      id: doseEventId,
      status: { in: [...ACTIONABLE_DOSE_STATUSES] },
      takenAt: null,
      skippedAt: null,
      missedAt: null,
    },
    data: {
      status: DOSE_STATUS.TAKEN,
      takenAt: new Date(),
      skippedAt: null,
      missedAt: null,
      skippedReason: null,
      confirmedByUserId,
      confirmationNote: input.confirmationNote,
    },
  });

  return {
    updated: result.count > 0,
    count: result.count,
  };
}

export async function skipDoseEventAction(
  prisma: PrismaClient,
  doseEventId: string,
  confirmedByUserId: string,
  input: DoseEventActionInput,
): Promise<DoseEventActionResult> {
  const result = await prisma.doseEvent.updateMany({
    where: {
      id: doseEventId,
      status: { in: [...ACTIONABLE_DOSE_STATUSES] },
      takenAt: null,
      skippedAt: null,
      missedAt: null,
    },
    data: {
      status: DOSE_STATUS.SKIPPED,
      skippedAt: new Date(),
      takenAt: null,
      missedAt: null,
      confirmedByUserId,
      skippedReason: input.skippedReason,
      confirmationNote: input.confirmationNote,
    },
  });

  return {
    updated: result.count > 0,
    count: result.count,
  };
}
