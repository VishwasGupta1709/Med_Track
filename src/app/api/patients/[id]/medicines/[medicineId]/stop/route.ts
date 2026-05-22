import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  MANAGE_MEDICINE_ROLES,
  PatientAccessError,
  requirePatientMembership,
} from "@/lib/auth/patient-access";
import { prisma } from "@/lib/prisma";
import { stopMedicine } from "@/lib/medicine-stop";

type RouteContext = {
  params: Promise<{
    id: string;
    medicineId: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { id, medicineId } = await context.params;
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    await requirePatientMembership(id, currentUser.id, MANAGE_MEDICINE_ROLES);
  } catch (error) {
    if (error instanceof PatientAccessError && error.code === "PATIENT_ROLE_REQUIRED") {
      return NextResponse.json({ error: "Patient access forbidden." }, { status: 403 });
    }

    return NextResponse.json({ error: "Patient not found." }, { status: 404 });
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
