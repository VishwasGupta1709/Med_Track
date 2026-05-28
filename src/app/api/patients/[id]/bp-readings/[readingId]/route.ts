import { NextResponse } from "next/server";
import { PatientRole } from "@prisma/client";
import {
  BPReadingInput,
  parseDateTimeInput,
  validateBPReadingInput,
} from "@/lib/bp-reading-validation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getPatientMembership, hasPatientRole } from "@/lib/auth/patient-access";
import { prisma } from "@/lib/prisma";

const BP_WRITE_ROLES = [PatientRole.PRIMARY_CAREGIVER, PatientRole.CAREGIVER];

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
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const bpReading = await prisma.bPReading.findFirst({
    where: {
      id: readingId,
      patientId: id,
    },
    select: { id: true, patientId: true },
  });

  if (!bpReading) {
    return NextResponse.json({ error: "BP reading not found." }, { status: 404 });
  }

  const membership = await getPatientMembership(bpReading.patientId, user.id);

  if (!membership) {
    return NextResponse.json({ error: "BP reading not found." }, { status: 404 });
  }

  if (!hasPatientRole(membership.role, BP_WRITE_ROLES)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
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
