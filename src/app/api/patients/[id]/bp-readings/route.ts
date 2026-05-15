import { NextResponse } from "next/server";
import {
  BPReadingInput,
  parseDateTimeInput,
  validateBPReadingInput,
} from "@/lib/bp-reading-validation";
import { prisma } from "@/lib/prisma";

const DEMO_USER_ID = "demo-user";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function cleanOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseOptionalInteger(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function normalizeBPReadingBody(body: unknown): BPReadingInput {
  const data = body && typeof body === "object" ? (body as Record<string, unknown>) : {};

  return {
    systolic: parseOptionalInteger(data.systolic),
    diastolic: parseOptionalInteger(data.diastolic),
    pulse: parseOptionalInteger(data.pulse),
    measuredAt: typeof data.measuredAt === "string" ? data.measuredAt.trim() : "",
    notes: cleanOptionalString(data.notes),
  };
}

async function findDemoPatient(patientId: string) {
  return prisma.patient.findFirst({
    where: {
      id: patientId,
      createdByUserId: DEMO_USER_ID,
    },
    select: { id: true },
  });
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const patient = await findDemoPatient(id);

  if (!patient) {
    return NextResponse.json({ error: "Patient not found." }, { status: 404 });
  }

  const bpReadings = await prisma.bPReading.findMany({
    where: { patientId: id },
    orderBy: { measuredAt: "desc" },
  });

  return NextResponse.json(bpReadings);
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const patient = await findDemoPatient(id);

  if (!patient) {
    return NextResponse.json({ error: "Patient not found." }, { status: 404 });
  }

  const input = normalizeBPReadingBody(await request.json().catch(() => null));
  const validation = validateBPReadingInput(input);

  if (!validation.isValid) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 });
  }

  const bpReading = await prisma.bPReading.create({
    data: {
      patientId: id,
      systolic: input.systolic!,
      diastolic: input.diastolic!,
      pulse: input.pulse,
      measuredAt: parseDateTimeInput(input.measuredAt)!,
      notes: input.notes,
    },
  });

  return NextResponse.json(bpReading, { status: 201 });
}
