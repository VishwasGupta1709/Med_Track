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

const FOLLOW_UP_WRITE_ROLES = [PatientRole.PRIMARY_CAREGIVER, PatientRole.CAREGIVER];

type RouteContext = {
  params: Promise<{
    id: string;
    followUpId: string;
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

export async function PATCH(request: Request, context: RouteContext) {
  const { id, followUpId } = await context.params;
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const followUp = await prisma.followUp.findFirst({
    where: {
      id: followUpId,
      patientId: id,
    },
    select: { id: true, patientId: true },
  });

  if (!followUp) {
    return NextResponse.json({ error: "Follow-up not found." }, { status: 404 });
  }

  const membership = await getPatientMembership(followUp.patientId, user.id);

  if (!membership) {
    return NextResponse.json({ error: "Patient not found." }, { status: 404 });
  }

  if (!hasPatientRole(membership.role, FOLLOW_UP_WRITE_ROLES)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const input = normalizeFollowUpBody(await request.json().catch(() => null));
  const validation = validateFollowUpInput(input);

  if (!validation.isValid) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 });
  }

  const updatedFollowUp = await prisma.followUp.update({
    where: { id: followUpId },
    data: {
      appointmentAt: parseDateTimeInput(input.appointmentAt)!,
      doctorName: input.doctorName,
      hospitalName: input.hospitalName,
      reason: input.reason,
      notes: input.notes,
    },
  });

  return NextResponse.json(updatedFollowUp);
}
