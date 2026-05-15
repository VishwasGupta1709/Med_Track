import type { PrismaClient } from "@prisma/client";
import { ACTIONABLE_DOSE_STATUSES, DOSE_STATUS } from "@/lib/dose-status";

const MISSED_CUTOFF_MINUTES = 30;

export type MissedDoseProcessingResult = {
  cutoffMinutes: number;
  cutoffAt: string;
  processed: number;
};

function getMissedCutoff(now: Date) {
  return new Date(now.getTime() - MISSED_CUTOFF_MINUTES * 60 * 1000);
}

export async function processMissedDosesForPatient(
  prisma: PrismaClient,
  patientId: string,
): Promise<MissedDoseProcessingResult> {
  const now = new Date();
  const cutoffAt = getMissedCutoff(now);

  const result = await prisma.doseEvent.updateMany({
    where: {
      patientId,
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

  return {
    cutoffMinutes: MISSED_CUTOFF_MINUTES,
    cutoffAt: cutoffAt.toISOString(),
    processed: result.count,
  };
}
