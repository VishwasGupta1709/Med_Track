import { NextResponse } from "next/server";
import { PatientRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getPatientMembership, hasPatientRole } from "@/lib/auth/patient-access";
import {
  MedicineInput,
  MedicineTimingInput,
  parseDateInput,
  validateMedicineInput,
} from "@/lib/medicine-validation";

const MEDICINE_MUTATION_ROLES = [PatientRole.PRIMARY_CAREGIVER];

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
  removedTimingIds: string[];
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

function normalizeRemovedTimingIds(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  const ids = new Set<string>();

  for (const item of value) {
    const id = cleanOptionalString(item);

    if (id) {
      ids.add(id);
    }
  }

  return [...ids];
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
    removedTimingIds: normalizeRemovedTimingIds(data.removedTimingIds),
  };
}

async function authorizeMedicineMutation(patientId: string) {
  const user = await getCurrentUser();

  if (!user) {
    return {
      error: NextResponse.json({ error: "Authentication required." }, { status: 401 }),
    };
  }

  const membership = await getPatientMembership(patientId, user.id);

  if (!membership) {
    return {
      error: NextResponse.json({ error: "Patient not found." }, { status: 404 }),
    };
  }

  if (!hasPatientRole(membership.role, MEDICINE_MUTATION_ROLES)) {
    return {
      error: NextResponse.json({ error: "Forbidden." }, { status: 403 }),
    };
  }

  return { membership };
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id, medicineId } = await context.params;
  const access = await authorizeMedicineMutation(id);

  if ("error" in access) {
    return access.error;
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
  const removedTimingIdSet = new Set(input.removedTimingIds);
  const overlappingTimingId = timingIds.find((timingId) => removedTimingIdSet.has(timingId));

  if (overlappingTimingId) {
    return NextResponse.json(
      { errors: { timings: "A removed timing cannot also be submitted as active." } },
      { status: 400 },
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const now = new Date();
    const existingTimings =
      timingIds.length > 0
        ? await tx.medicineTiming.findMany({
            where: {
              id: { in: timingIds },
              medicineId,
              removedAt: null,
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

    const removedTimings =
      input.removedTimingIds.length > 0
        ? await tx.medicineTiming.findMany({
            where: {
              id: { in: input.removedTimingIds },
              medicineId,
            },
            select: { id: true },
          })
        : [];
    const foundRemovedTimingIds = new Set(removedTimings.map((timing) => timing.id));

    if (foundRemovedTimingIds.size !== input.removedTimingIds.length) {
      return {
        error: "One or more removed timings do not belong to this medicine.",
      };
    }

    if (input.removedTimingIds.length > 0) {
      await tx.medicineTiming.updateMany({
        where: {
          id: { in: input.removedTimingIds },
          medicineId,
        },
        data: {
          removedAt: now,
        },
      });
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
            removedAt: null,
          },
        });
      }
    }

    const deletedRemovedTimingFuturePendingDoseEvents =
      input.removedTimingIds.length > 0
        ? await tx.doseEvent.deleteMany({
            where: {
              medicineId,
              medicineTimingId: { in: input.removedTimingIds },
              scheduledAt: {
                gt: now,
              },
              status: "PENDING",
            },
          })
        : { count: 0 };

    const deletedFuturePendingDoseEvents = await tx.doseEvent.deleteMany({
      where: {
        medicineId,
        scheduledAt: {
          gte: now,
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
          where: { removedAt: null },
          orderBy: { timeOfDay: "asc" },
        },
      },
    });

    return {
      medicine: updatedMedicine,
      deletedFuturePendingDoseEvents:
        deletedRemovedTimingFuturePendingDoseEvents.count + deletedFuturePendingDoseEvents.count,
    };
  });

  if ("error" in result) {
    return NextResponse.json({ errors: { timings: result.error } }, { status: 400 });
  }

  return NextResponse.json(result);
}
