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
  }>;
};

function cleanOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeTimings(value: unknown): MedicineTimingInput[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const timings: MedicineTimingInput[] = [];

  for (const item of value) {
    const data = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const label = cleanOptionalString(data.label);
    const timeOfDay = typeof data.timeOfDay === "string" ? data.timeOfDay.trim() : "";

    if (!label && !timeOfDay) {
      continue;
    }

    const key = `${label || ""}|${timeOfDay}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    timings.push({ label, timeOfDay });
  }

  return timings;
}

function normalizeMedicineBody(body: unknown): MedicineInput {
  const data = body && typeof body === "object" ? (body as Record<string, unknown>) : {};

  return {
    name: typeof data.name === "string" ? data.name.trim() : "",
    dosage: cleanOptionalString(data.dosage),
    form: cleanOptionalString(data.form),
    frequency: cleanOptionalString(data.frequency),
    foodInstruction: cleanOptionalString(data.foodInstruction),
    instructions: cleanOptionalString(data.instructions),
    status: cleanOptionalString(data.status) || "ACTIVE",
    startDate: typeof data.startDate === "string" ? data.startDate.trim() : "",
    endDate: cleanOptionalString(data.endDate),
    timings: normalizeTimings(data.timings),
  };
}

async function authorizeMedicineAccess(patientId: string, requireMutation = false) {
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

  if (requireMutation && !hasPatientRole(membership.role, MEDICINE_MUTATION_ROLES)) {
    return {
      error: NextResponse.json({ error: "Forbidden." }, { status: 403 }),
    };
  }

  return { membership };
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const access = await authorizeMedicineAccess(id);

  if ("error" in access) {
    return access.error;
  }

  const medicines = await prisma.medicine.findMany({
    where: { patientId: id },
    include: {
      timings: {
        orderBy: { timeOfDay: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(medicines);
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const access = await authorizeMedicineAccess(id, true);

  if ("error" in access) {
    return access.error;
  }

  const input = normalizeMedicineBody(await request.json().catch(() => null));
  const validation = validateMedicineInput(input);

  if (!validation.isValid) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 });
  }

  const medicine = await prisma.medicine.create({
    data: {
      patientId: id,
      name: input.name,
      dosage: input.dosage,
      form: input.form,
      frequency: input.frequency,
      foodInstruction: input.foodInstruction,
      instructions: input.instructions,
      status: input.status || "ACTIVE",
      startDate: parseDateInput(input.startDate)!,
      endDate: input.endDate ? parseDateInput(input.endDate) : null,
      timings: {
        create: input.timings.map((timing) => ({
          label: timing.label || null,
          timeOfDay: timing.timeOfDay,
        })),
      },
    },
    include: {
      timings: {
        orderBy: { timeOfDay: "asc" },
      },
    },
  });

  return NextResponse.json(medicine, { status: 201 });
}
