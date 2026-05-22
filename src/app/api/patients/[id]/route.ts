import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  PatientAccessError,
  requirePatientMembership,
  VIEW_PATIENT_ROLES,
} from "@/lib/auth/patient-access";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    await requirePatientMembership(id, currentUser.id, VIEW_PATIENT_ROLES);
  } catch (error) {
    if (error instanceof PatientAccessError && error.code === "PATIENT_ROLE_REQUIRED") {
      return NextResponse.json({ error: "Patient access forbidden." }, { status: 403 });
    }

    return NextResponse.json({ error: "Patient not found." }, { status: 404 });
  }

  const patient = await prisma.patient.findUnique({
    where: { id },
  });

  if (!patient) {
    return NextResponse.json({ error: "Patient not found." }, { status: 404 });
  }

  return NextResponse.json(patient);
}
