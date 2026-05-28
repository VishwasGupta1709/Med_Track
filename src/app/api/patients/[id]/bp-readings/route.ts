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

const BP_READ_ROLES = [
  PatientRole.PRIMARY_CAREGIVER,
  PatientRole.CAREGIVER,
  PatientRole.VIEWER,
];
const BP_WRITE_ROLES = [PatientRole.PRIMARY_CAREGIVER, PatientRole.CAREGIVER];

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

async function authorizeBPAccess(patientId: string, allowedRoles: PatientRole[]) {
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

  if (!hasPatientRole(membership.role, allowedRoles)) {
    return {
      error: NextResponse.json({ error: "Forbidden." }, { status: 403 }),
    };
  }

  return { membership };
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const access = await authorizeBPAccess(id, BP_READ_ROLES);

  if ("error" in access) {
    return access.error;
  }

  const bpReadings = await prisma.bPReading.findMany({
    where: { patientId: id },
    orderBy: { measuredAt: "desc" },
  });

  return NextResponse.json(bpReadings);
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const access = await authorizeBPAccess(id, BP_WRITE_ROLES);

  if ("error" in access) {
    return access.error;
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
