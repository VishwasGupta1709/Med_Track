import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTodayWindow } from "@/lib/schedule-generation";

const DEMO_USER_ID = "demo-user";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
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

  const today = getTodayWindow();
  const doseEvents = await prisma.doseEvent.findMany({
    where: {
      patientId: id,
      scheduledAt: {
        gte: today.start,
        lt: today.end,
      },
    },
    orderBy: { scheduledAt: "asc" },
  });

  return NextResponse.json(doseEvents);
}
