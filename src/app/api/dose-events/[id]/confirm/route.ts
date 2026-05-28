import { NextResponse } from "next/server";
import { PatientRole } from "@prisma/client";
import { confirmDoseEventAction } from "@/lib/dose-event-actions";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getPatientMembership, hasPatientRole } from "@/lib/auth/patient-access";
import { prisma } from "@/lib/prisma";
import {
  normalizeDoseEventActionBody,
  validateDoseEventActionInput,
} from "@/lib/dose-event-validation";

const DOSE_ACTION_ROLES = [PatientRole.PRIMARY_CAREGIVER, PatientRole.CAREGIVER];

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const doseEvent = await prisma.doseEvent.findFirst({
    where: {
      id,
    },
    select: { id: true, patientId: true },
  });

  if (!doseEvent) {
    return NextResponse.json({ error: "Dose event not found." }, { status: 404 });
  }

  const membership = await getPatientMembership(doseEvent.patientId, user.id);

  if (!membership) {
    return NextResponse.json({ error: "Dose event not found." }, { status: 404 });
  }

  if (!hasPatientRole(membership.role, DOSE_ACTION_ROLES)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const input = normalizeDoseEventActionBody(await request.json().catch(() => null));
  const validation = validateDoseEventActionInput(input);

  if (!validation.isValid) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 });
  }

  const updateResult = await confirmDoseEventAction(prisma, id, user.id, input);

  if (!updateResult.updated) {
    return NextResponse.json({ error: "Dose event can no longer be confirmed." }, { status: 409 });
  }

  const updatedDoseEvent = await prisma.doseEvent.findFirst({
    where: {
      id,
      patientId: doseEvent.patientId,
    },
  });

  return NextResponse.json(updatedDoseEvent);
}
