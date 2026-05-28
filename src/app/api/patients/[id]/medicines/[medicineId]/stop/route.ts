import { NextResponse } from "next/server";
import { PatientRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getPatientMembership, hasPatientRole } from "@/lib/auth/patient-access";
import { stopMedicine } from "@/lib/medicine-stop";

const MEDICINE_MUTATION_ROLES = [PatientRole.PRIMARY_CAREGIVER];

type RouteContext = {
  params: Promise<{
    id: string;
    medicineId: string;
  }>;
};

async function authorizeMedicineMutation(patientId: string) {
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

  if (!hasPatientRole(membership.role, MEDICINE_MUTATION_ROLES)) {
    return {
      error: NextResponse.json({ error: "Forbidden." }, { status: 403 }),
    };
  }

  return { membership };
}

export async function POST(_request: Request, context: RouteContext) {
  const { id, medicineId } = await context.params;
  const access = await authorizeMedicineMutation(id);

  if ("error" in access) {
    return access.error;
  }

  const medicine = await prisma.medicine.findFirst({
    where: {
      id: medicineId,
      patientId: id,
    },
    select: {
      id: true,
      endDate: true,
    },
  });

  if (!medicine) {
    return NextResponse.json({ error: "Medicine not found." }, { status: 404 });
  }

  const result = await stopMedicine(prisma, medicine);

  return NextResponse.json(result);
}
