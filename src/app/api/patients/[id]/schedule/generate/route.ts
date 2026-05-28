import { NextResponse } from "next/server";
import { PatientRole } from "@prisma/client";
import { generateDoseEventsForPatient } from "@/lib/schedule-generation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getPatientMembership, hasPatientRole } from "@/lib/auth/patient-access";
import { prisma } from "@/lib/prisma";

const SCHEDULE_GENERATE_ROLES = [PatientRole.PRIMARY_CAREGIVER];

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

async function authorizeScheduleGeneration(patientId: string) {
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

  if (!hasPatientRole(membership.role, SCHEDULE_GENERATE_ROLES)) {
    return {
      error: NextResponse.json({ error: "Forbidden." }, { status: 403 }),
    };
  }

  return { membership };
}

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const access = await authorizeScheduleGeneration(id);

  if ("error" in access) {
    return access.error;
  }

  const result = await generateDoseEventsForPatient(prisma, id);

  return NextResponse.json(result);
}
