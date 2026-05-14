import { NextResponse } from "next/server";
import { generateDoseEventsForPatient } from "@/lib/schedule-generation";
import { prisma } from "@/lib/prisma";

const DEMO_USER_ID = "demo-user";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;

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

  const result = await generateDoseEventsForPatient(prisma, id);

  return NextResponse.json(result);
}
