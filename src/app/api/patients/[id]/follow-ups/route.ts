import { NextResponse } from "next/server";
import { PatientRole } from "@prisma/client";
import {
  FOLLOW_UP_STATUS,
  FollowUpInput,
  parseDateTimeInput,
  validateFollowUpInput,
} from "@/lib/follow-up-validation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getPatientMembership, hasPatientRole } from "@/lib/auth/patient-access";
import { prisma } from "@/lib/prisma";

const FOLLOW_UP_READ_ROLES = [
  PatientRole.PRIMARY_CAREGIVER,
  PatientRole.CAREGIVER,
  PatientRole.VIEWER,
];
const FOLLOW_UP_WRITE_ROLES = [PatientRole.PRIMARY_CAREGIVER, PatientRole.CAREGIVER];

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function cleanOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeFollowUpBody(body: unknown): FollowUpInput {
  const data = body && typeof body === "object" ? (body as Record<string, unknown>) : {};

  return {
    appointmentAt: typeof data.appointmentAt === "string" ? data.appointmentAt.trim() : "",
    doctorName: cleanOptionalString(data.doctorName),
    hospitalName: cleanOptionalString(data.hospitalName),
    reason: cleanOptionalString(data.reason),
    notes: cleanOptionalString(data.notes),
    status: cleanOptionalString(data.status) ?? FOLLOW_UP_STATUS.UPCOMING,
  };
}

async function authorizeFollowUpAccess(patientId: string, allowedRoles: PatientRole[]) {
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
  const access = await authorizeFollowUpAccess(id, FOLLOW_UP_READ_ROLES);

  if ("error" in access) {
    return access.error;
  }

  const followUps = await prisma.followUp.findMany({
    where: { patientId: id },
    orderBy: { appointmentAt: "asc" },
  });

  return NextResponse.json(followUps);
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const access = await authorizeFollowUpAccess(id, FOLLOW_UP_WRITE_ROLES);

  if ("error" in access) {
    return access.error;
  }

  const input = normalizeFollowUpBody(await request.json().catch(() => null));
  const validation = validateFollowUpInput(input);

  if (!validation.isValid) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 });
  }

  const followUp = await prisma.followUp.create({
    data: {
      patientId: id,
      appointmentAt: parseDateTimeInput(input.appointmentAt)!,
      doctorName: input.doctorName,
      hospitalName: input.hospitalName,
      reason: input.reason,
      notes: input.notes,
      status: input.status ?? FOLLOW_UP_STATUS.UPCOMING,
    },
  });

  return NextResponse.json(followUp, { status: 201 });
}
