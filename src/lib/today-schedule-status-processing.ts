import type { PrismaClient } from "@prisma/client";
import { ACTIONABLE_DOSE_STATUSES, DOSE_STATUS } from "@/lib/dose-status";

const MISSED_CUTOFF_MINUTES = 30;

export type TodayScheduleStatusProcessingResult = {
  processedAt: string;
  cutoffMinutes: number;
  cutoffAt: string;
  missed: number;
  due: number;
};

function getMissedCutoff(now: Date) {
  return new Date(now.getTime() - MISSED_CUTOFF_MINUTES * 60 * 1000);
}

export async function refreshTodayScheduleStatusesForPatient(
  prisma: PrismaClient,
  patientId: string,
  now = new Date(),
): Promise<TodayScheduleStatusProcessingResult> {
  const cutoffAt = getMissedCutoff(now);

  const missedResult = await prisma.doseEvent.updateMany({
    where: {
      patientId,
      medicine: {
        patientId,
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

  const dueResult = await prisma.doseEvent.updateMany({
    where: {
      patientId,
      medicine: {
        patientId,
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

  return {
    processedAt: now.toISOString(),
    cutoffMinutes: MISSED_CUTOFF_MINUTES,
    cutoffAt: cutoffAt.toISOString(),
    missed: missedResult.count,
    due: dueResult.count,
  };
}
