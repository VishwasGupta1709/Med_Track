import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  MedicineInput,
  MedicineTimingInput,
  parseDateInput,
  validateMedicineInput,
} from "@/lib/medicine-validation";

const DEMO_USER_ID = "demo-user";

type RouteContext = {
  params: Promise<{
    id: string;
    medicineId: string;
  }>;
};

type MedicineTimingEditInput = MedicineTimingInput & {
  id?: string | null;
};

type MedicineEditInput = Omit<MedicineInput, "timings"> & {
  timings: MedicineTimingEditInput[];
};

function cleanOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeTimings(value: unknown): MedicineTimingEditInput[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const timings: MedicineTimingEditInput[] = [];

  for (const item of value) {
    const data = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const id = cleanOptionalString(data.id);
    const label = cleanOptionalString(data.label);
    const timeOfDay = typeof data.timeOfDay === "string" ? data.timeOfDay.trim() : "";

    if (!id && !label && !timeOfDay) {
      continue;
    }

    const key = `${id || ""}|${label || ""}|${timeOfDay}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    timings.push({ id, label, timeOfDay });
  }

  return timings;
}

function normalizeMedicineBody(body: unknown): MedicineEditInput {
  const data = body && typeof body === "object" ? (body as Record<string, unknown>) : {};

  return {
    name: typeof data.name === "string" ? data.name.trim() : "",
    dosage: cleanOptionalString(data.dosage),
    form: cleanOptionalString(data.form),
    frequency: cleanOptionalString(data.frequency),
    foodInstruction: cleanOptionalString(data.foodInstruction),
    instructions: cleanOptionalString(data.instructions),
    startDate: typeof data.startDate === "string" ? data.startDate.trim() : "",
    endDate: cleanOptionalString(data.endDate),
    timings: normalizeTimings(data.timings),
  };
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id, medicineId } = await context.params;

  const patient = await prisma.patient.findFirst({
    where: {
      id,
      createdByUserId: DEMO_USER_ID,
    },
    select: { id: true },
  });

  if (!patient) {
    return NextResponse.json({ error: "Patient not found." }, { status: 404 });
  }

  const medicine = await prisma.medicine.findFirst({
    where: {
      id: medicineId,
      patientId: id,
    },
    select: { id: true },
  });

  if (!medicine) {
    return NextResponse.json({ error: "Medicine not found." }, { status: 404 });
  }

  const input = normalizeMedicineBody(await request.json().catch(() => null));
  const validation = validateMedicineInput(input);

  if (!validation.isValid) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 });
  }

  const timingIds = input.timings
    .map((timing) => timing.id)
    .filter((timingId): timingId is string => Boolean(timingId));

  const result = await prisma.$transaction(async (tx) => {
    const existingTimings =
      timingIds.length > 0
        ? await tx.medicineTiming.findMany({
            where: {
              id: { in: timingIds },
              medicineId,
            },
            select: { id: true },
          })
        : [];
    const existingTimingIds = new Set(existingTimings.map((timing) => timing.id));

    if (existingTimingIds.size !== new Set(timingIds).size) {
      return {
        error: "One or more timings do not belong to this medicine.",
      };
    }

    for (const timing of input.timings) {
      if (timing.id) {
        await tx.medicineTiming.update({
          where: { id: timing.id },
          data: {
            label: timing.label || null,
            timeOfDay: timing.timeOfDay,
          },
        });
      } else {
        await tx.medicineTiming.create({
          data: {
            medicineId,
            label: timing.label || null,
            timeOfDay: timing.timeOfDay,
          },
        });
      }
    }

    const deletedFuturePendingDoseEvents = await tx.doseEvent.deleteMany({
      where: {
        medicineId,
        scheduledAt: {
          gte: new Date(),
        },
        status: "PENDING",
      },
    });

    const updatedMedicine = await tx.medicine.update({
      where: { id: medicineId },
      data: {
        name: input.name,
        dosage: input.dosage,
        form: input.form,
        frequency: input.frequency,
        foodInstruction: input.foodInstruction,
        instructions: input.instructions,
        startDate: parseDateInput(input.startDate)!,
        endDate: input.endDate ? parseDateInput(input.endDate) : null,
      },
      include: {
        timings: {
          orderBy: { timeOfDay: "asc" },
        },
      },
    });

    return {
      medicine: updatedMedicine,
      deletedFuturePendingDoseEvents: deletedFuturePendingDoseEvents.count,
    };
  });

  if ("error" in result) {
    return NextResponse.json({ errors: { timings: result.error } }, { status: 400 });
  }

  return NextResponse.json(result);
}
