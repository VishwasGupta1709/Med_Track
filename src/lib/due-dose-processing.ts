import type { PrismaClient } from "@prisma/client";
import { DOSE_STATUS } from "@/lib/dose-status";

export type DueDoseProcessingResult = {
  processedAt: string;
  processed: number;
};

export async function processDueDosesForPatient(
  prisma: PrismaClient,
  patientId: string,
): Promise<DueDoseProcessingResult> {
  const now = new Date();

  const result = await prisma.doseEvent.updateMany({
    where: {
      patientId,
      status: DOSE_STATUS.PENDING,
      scheduledAt: { lte: now },
    },
    data: {
      status: DOSE_STATUS.DUE,
    },
  });

  return {
    processedAt: now.toISOString(),
    processed: result.count,
  };
}
