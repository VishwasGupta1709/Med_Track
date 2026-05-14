-- CreateTable
CREATE TABLE "Medicine" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dosage" TEXT,
    "form" TEXT,
    "frequency" TEXT,
    "foodInstruction" TEXT,
    "instructions" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Medicine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicineTiming" (
    "id" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "label" TEXT,
    "timeOfDay" TEXT NOT NULL,

    CONSTRAINT "MedicineTiming_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Medicine_patientId_idx" ON "Medicine"("patientId");

-- CreateIndex
CREATE INDEX "Medicine_createdAt_idx" ON "Medicine"("createdAt");

-- CreateIndex
CREATE INDEX "MedicineTiming_medicineId_idx" ON "MedicineTiming"("medicineId");

-- AddForeignKey
ALTER TABLE "Medicine" ADD CONSTRAINT "Medicine_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineTiming" ADD CONSTRAINT "MedicineTiming_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
