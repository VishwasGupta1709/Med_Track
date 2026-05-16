import type { Medicine, MedicineTiming, PrismaClient } from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DOSE_STATUS } from "@/lib/dose-status";
import { generateDoseEventsForPatient } from "@/lib/schedule-generation";

type MedicineWithTimings = Medicine & {
  timings: MedicineTiming[];
};

function createMedicine(
  overrides: Partial<Medicine> & { timings?: Partial<MedicineTiming>[] } = {},
): MedicineWithTimings {
  const medicineId = overrides.id ?? "medicine-1";

  return {
    id: medicineId,
    patientId: overrides.patientId ?? "patient-1",
    name: overrides.name ?? "Medicine",
    dosage: overrides.dosage ?? null,
    form: overrides.form ?? null,
    frequency: overrides.frequency ?? null,
    foodInstruction: overrides.foodInstruction ?? null,
    instructions: overrides.instructions ?? null,
    status: overrides.status ?? "ACTIVE",
    startDate: overrides.startDate ?? new Date(2026, 4, 16),
    endDate: overrides.endDate ?? null,
    createdAt: overrides.createdAt ?? new Date(2026, 4, 16),
    updatedAt: overrides.updatedAt ?? new Date(2026, 4, 16),
    timings: (overrides.timings ?? [{ id: "timing-1", timeOfDay: "09:00" }]).map(
      (timing, index) => ({
        id: timing.id ?? `timing-${index + 1}`,
        medicineId,
        label: timing.label ?? null,
        timeOfDay: timing.timeOfDay ?? "09:00",
      }),
    ),
  };
}

function createPrismaMock(medicines: MedicineWithTimings[], created = medicines.length) {
  const findMany = vi.fn().mockResolvedValue(medicines);
  const createMany = vi.fn().mockResolvedValue({ count: created });
  const prisma = {
    medicine: { findMany },
    doseEvent: { createMany },
  } as unknown as PrismaClient;

  return { prisma, findMany, createMany };
}

describe("generateDoseEventsForPatient", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("requests only ACTIVE medicines for the patient", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 16, 10, 0));
    const { prisma, findMany, createMany } = createPrismaMock([createMedicine()]);

    await generateDoseEventsForPatient(prisma, "patient-1");

    expect(findMany).toHaveBeenCalledWith({
      where: {
        patientId: "patient-1",
        status: "ACTIVE",
      },
      include: {
        timings: {
          orderBy: { timeOfDay: "asc" },
        },
      },
    });
    expect(createMany).toHaveBeenCalled();
  });

  it("ignores invalid timing values", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 16, 10, 0));
    const { prisma, createMany } = createPrismaMock([
      createMedicine({
        timings: [
          { id: "valid", timeOfDay: "09:00" },
          { id: "invalid-hour", timeOfDay: "25:00" },
          { id: "invalid-text", timeOfDay: "morning" },
        ],
      }),
    ]);

    const result = await generateDoseEventsForPatient(prisma, "patient-1");
    const call = createMany.mock.calls[0][0];

    expect(result.attempted).toBe(7);
    expect(call.data).toHaveLength(7);
    expect(call.data.every((event) => event.medicineTimingId === "valid")).toBe(true);
  });

  it("respects medicine startDate", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 16, 10, 0));
    const { prisma, createMany } = createPrismaMock([
      createMedicine({
        startDate: new Date(2026, 4, 18),
      }),
    ]);

    const result = await generateDoseEventsForPatient(prisma, "patient-1");
    const call = createMany.mock.calls[0][0];

    expect(result.attempted).toBe(5);
    expect(call.data).toHaveLength(5);
    expect(call.data[0].scheduledAt.getDate()).toBe(18);
  });

  it("respects medicine endDate", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 16, 10, 0));
    const { prisma, createMany } = createPrismaMock([
      createMedicine({
        endDate: new Date(2026, 4, 18),
      }),
    ]);

    const result = await generateDoseEventsForPatient(prisma, "patient-1");
    const call = createMany.mock.calls[0][0];

    expect(result.attempted).toBe(3);
    expect(call.data).toHaveLength(3);
    expect(call.data.at(-1)?.scheduledAt.getDate()).toBe(18);
  });

  it("uses duplicate-safe createMany behavior", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 16, 10, 0));
    const { prisma, createMany } = createPrismaMock([createMedicine()], 0);

    const result = await generateDoseEventsForPatient(prisma, "patient-1");

    expect(result.created).toBe(0);
    expect(createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skipDuplicates: true,
      }),
    );
  });

  it("creates events for exactly 7 calendar days", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 16, 10, 0));
    const { prisma, createMany } = createPrismaMock([createMedicine()]);

    const result = await generateDoseEventsForPatient(prisma, "patient-1");
    const call = createMany.mock.calls[0][0];
    const scheduledDays = new Set(
      call.data.map((event) => event.scheduledAt.toISOString().slice(0, 10)),
    );

    expect(result.attempted).toBe(7);
    expect(call.data).toHaveLength(7);
    expect(scheduledDays.size).toBe(7);
    expect(call.data[0]).toMatchObject({
      patientId: "patient-1",
      status: DOSE_STATUS.PENDING,
      medicineNameSnapshot: "Medicine",
      timingTimeSnapshot: "09:00",
    });
  });
});
