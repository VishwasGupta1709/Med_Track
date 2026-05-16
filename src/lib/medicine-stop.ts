import type { Medicine, PrismaClient } from "@prisma/client";
import { DOSE_STATUS } from "@/lib/dose-status";

export const MEDICINE_STOPPED_STATUS = "STOPPED";

export const STOPPED_MEDICINE_CLEANUP_STATUSES = [
  DOSE_STATUS.PENDING,
  DOSE_STATUS.DUE,
  DOSE_STATUS.LATE,
] as const;

export type StoppableMedicine = Pick<Medicine, "id" | "endDate">;

export async function stopMedicine(
  prisma: PrismaClient,
  medicine: StoppableMedicine,
  stoppedAt = new Date(),
) {
  return prisma.$transaction(async (tx) => {
    const updatedMedicine = await tx.medicine.update({
      where: { id: medicine.id },
      data: {
        status: MEDICINE_STOPPED_STATUS,
        ...(medicine.endDate ? {} : { endDate: stoppedAt }),
      },
    });

    const deletedDoseEvents = await tx.doseEvent.deleteMany({
      where: {
        medicineId: medicine.id,
        scheduledAt: { gte: stoppedAt },
        status: { in: [...STOPPED_MEDICINE_CLEANUP_STATUSES] },
      },
    });

    return {
      medicine: updatedMedicine,
      removedFutureDoseEvents: deletedDoseEvents.count,
    };
  });
}
