import type { Medicine, MedicineTiming, PrismaClient } from "@prisma/client";

const GENERATION_DAYS = 7;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

type MedicineWithTimings = Medicine & {
  timings: MedicineTiming[];
};

export type ScheduleGenerationResult = {
  generatedWindowStart: string;
  generatedWindowEnd: string;
  attempted: number;
  created: number;
};

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function isSameOrAfterDay(date: Date, boundary: Date) {
  return startOfLocalDay(date) >= startOfLocalDay(boundary);
}

function isSameOrBeforeDay(date: Date, boundary: Date) {
  return startOfLocalDay(date) <= startOfLocalDay(boundary);
}

function buildScheduledAt(date: Date, timeOfDay: string) {
  const [hours, minutes] = timeOfDay.split(":").map(Number);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes);
}

function buildDoseEvents(patientId: string, medicines: MedicineWithTimings[], windowStart: Date) {
  const events = [];

  for (let offset = 0; offset <= GENERATION_DAYS; offset += 1) {
    const targetDate = addDays(windowStart, offset);

    for (const medicine of medicines) {
      if (!isSameOrAfterDay(targetDate, medicine.startDate)) {
        continue;
      }

      if (medicine.endDate && !isSameOrBeforeDay(targetDate, medicine.endDate)) {
        continue;
      }

      for (const timing of medicine.timings) {
        if (!TIME_PATTERN.test(timing.timeOfDay)) {
          continue;
        }

        events.push({
          patientId,
          medicineId: medicine.id,
          medicineTimingId: timing.id,
          scheduledAt: buildScheduledAt(targetDate, timing.timeOfDay),
          status: "PENDING",
          medicineNameSnapshot: medicine.name,
          dosageSnapshot: medicine.dosage,
          foodInstructionSnapshot: medicine.foodInstruction,
          instructionsSnapshot: medicine.instructions,
          timingLabelSnapshot: timing.label,
          timingTimeSnapshot: timing.timeOfDay,
        });
      }
    }
  }

  return events;
}

export function getTodayWindow(now = new Date()) {
  const start = startOfLocalDay(now);
  const end = addDays(start, 1);

  return { start, end };
}

export async function generateDoseEventsForPatient(
  prisma: PrismaClient,
  patientId: string,
): Promise<ScheduleGenerationResult> {
  const windowStart = startOfLocalDay(new Date());
  const windowEnd = addDays(windowStart, GENERATION_DAYS);

  const medicines = await prisma.medicine.findMany({
    where: {
      patientId,
      status: "ACTIVE",
    },
    include: {
      timings: {
        orderBy: { timeOfDay: "asc" },
      },
    },
  });

  const events = buildDoseEvents(patientId, medicines, windowStart);
  const result =
    events.length > 0
      ? await prisma.doseEvent.createMany({
          data: events,
          skipDuplicates: true,
        })
      : { count: 0 };

  return {
    generatedWindowStart: windowStart.toISOString(),
    generatedWindowEnd: windowEnd.toISOString(),
    attempted: events.length,
    created: result.count,
  };
}
