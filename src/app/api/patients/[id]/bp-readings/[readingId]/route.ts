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
    readingId: string;
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

export async function PATCH(request: Request, context: RouteContext) {
  const { id, readingId } = await context.params;

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

  const bpReading = await prisma.bPReading.findFirst({
    where: {
      id: readingId,
      patientId: id,
    },
    select: { id: true },
  });

  if (!bpReading) {
    return NextResponse.json({ error: "BP reading not found." }, { status: 404 });
  }

  const input = normalizeBPReadingBody(await request.json().catch(() => null));
  const validation = validateBPReadingInput(input);

  if (!validation.isValid) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 });
  }

  const updatedBPReading = await prisma.bPReading.update({
    where: { id: readingId },
    data: {
      systolic: input.systolic!,
      diastolic: input.diastolic!,
      pulse: input.pulse,
      measuredAt: parseDateTimeInput(input.measuredAt)!,
      notes: input.notes,
    },
  });

  return NextResponse.json(updatedBPReading);
}
