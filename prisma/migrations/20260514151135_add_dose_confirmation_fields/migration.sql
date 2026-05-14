-- AlterTable
ALTER TABLE "DoseEvent" ADD COLUMN     "confirmationNote" TEXT,
ADD COLUMN     "confirmedByUserId" TEXT,
ADD COLUMN     "skippedAt" TIMESTAMP(3),
ADD COLUMN     "skippedReason" TEXT,
ADD COLUMN     "takenAt" TIMESTAMP(3);
