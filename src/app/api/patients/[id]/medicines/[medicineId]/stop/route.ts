import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stopMedicine } from "@/lib/medicine-stop";

const DEMO_USER_ID = "demo-user";

type RouteContext = {
  params: Promise<{
    id: string;
    medicineId: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { id, medicineId } = await context.params;

  const patient = await prisma.patient.findFirst({
    where: {
      id,
      createdByUserId: DEMO_USER_ID,
    },
    select: { id: true },
  });

  if (!patient) {
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
