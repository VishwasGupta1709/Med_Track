-- CreateTable
CREATE TABLE "DoseEvent" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "medicineTimingId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "medicineNameSnapshot" TEXT NOT NULL,
    "dosageSnapshot" TEXT,
    "foodInstructionSnapshot" TEXT,
    "instructionsSnapshot" TEXT,
    "timingLabelSnapshot" TEXT,
    "timingTimeSnapshot" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoseEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DoseEvent_patientId_scheduledAt_idx" ON "DoseEvent"("patientId", "scheduledAt");

-- CreateIndex
CREATE INDEX "DoseEvent_patientId_status_idx" ON "DoseEvent"("patientId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "DoseEvent_medicineId_medicineTimingId_scheduledAt_key" ON "DoseEvent"("medicineId", "medicineTimingId", "scheduledAt");

-- AddForeignKey
ALTER TABLE "DoseEvent" ADD CONSTRAINT "DoseEvent_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoseEvent" ADD CONSTRAINT "DoseEvent_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoseEvent" ADD CONSTRAINT "DoseEvent_medicineTimingId_fkey" FOREIGN KEY ("medicineTimingId") REFERENCES "MedicineTiming"("id") ON DELETE CASCADE ON UPDATE CASCADE;
