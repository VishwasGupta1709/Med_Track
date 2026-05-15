-- CreateTable
CREATE TABLE "BPReading" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "systolic" INTEGER NOT NULL,
    "diastolic" INTEGER NOT NULL,
    "pulse" INTEGER,
    "measuredAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BPReading_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BPReading_patientId_idx" ON "BPReading"("patientId");

-- CreateIndex
CREATE INDEX "BPReading_patientId_measuredAt_idx" ON "BPReading"("patientId", "measuredAt");

-- AddForeignKey
ALTER TABLE "BPReading" ADD CONSTRAINT "BPReading_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
