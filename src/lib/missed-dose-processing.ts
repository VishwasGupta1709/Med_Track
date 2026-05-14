import type { PrismaClient } from "@prisma/client";

const MISSED_CUTOFF_MINUTES = 30;
const PROCESSABLE_STATUSES = ["PENDING", "DUE"];

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
      status: { in: PROCESSABLE_STATUSES },
      scheduledAt: { lte: cutoffAt },
    },
    data: {
      status: "MISSED",
      missedAt: now,
    },
  });

  return {
    cutoffMinutes: MISSED_CUTOFF_MINUTES,
    cutoffAt: cutoffAt.toISOString(),
    processed: result.count,
  };
}
