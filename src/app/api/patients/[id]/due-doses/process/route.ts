import { NextResponse } from "next/server";
import { PatientRole } from "@prisma/client";
import { processDueDosesForPatient } from "@/lib/due-dose-processing";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getPatientMembership, hasPatientRole } from "@/lib/auth/patient-access";
import { prisma } from "@/lib/prisma";

const DOSE_PROCESS_ROLES = [PatientRole.PRIMARY_CAREGIVER, PatientRole.CAREGIVER];

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

async function authorizeDoseProcessing(patientId: string) {
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

  if (!hasPatientRole(membership.role, DOSE_PROCESS_ROLES)) {
    return {
      error: NextResponse.json({ error: "Forbidden." }, { status: 403 }),
    };
  }

  return { membership };
}

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const access = await authorizeDoseProcessing(id);

  if ("error" in access) {
    return access.error;
  }

  const result = await processDueDosesForPatient(prisma, id);

  return NextResponse.json(result);
}
