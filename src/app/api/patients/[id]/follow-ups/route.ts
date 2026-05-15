import { NextResponse } from "next/server";
import {
  FOLLOW_UP_STATUS,
  FollowUpInput,
  parseDateTimeInput,
  validateFollowUpInput,
} from "@/lib/follow-up-validation";
import { prisma } from "@/lib/prisma";

const DEMO_USER_ID = "demo-user";

type RouteContext = {
  params: Promise<{
    id: string;
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

async function findDemoPatient(patientId: string) {
  return prisma.patient.findFirst({
    where: {
      id: patientId,
      createdByUserId: DEMO_USER_ID,
    },
    select: { id: true },
  });
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const patient = await findDemoPatient(id);

  if (!patient) {
    return NextResponse.json({ error: "Patient not found." }, { status: 404 });
  }

  const followUps = await prisma.followUp.findMany({
    where: { patientId: id },
    orderBy: { appointmentAt: "asc" },
  });

  return NextResponse.json(followUps);
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const patient = await findDemoPatient(id);

  if (!patient) {
    return NextResponse.json({ error: "Patient not found." }, { status: 404 });
  }

  const input = normalizeFollowUpBody(await request.json().catch(() => null));
  const validation = validateFollowUpInput(input);

  if (!validation.isValid) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 });
  }

  const followUp = await prisma.followUp.create({
    data: {
      patientId: id,
      appointmentAt: parseDateTimeInput(input.appointmentAt)!,
      doctorName: input.doctorName,
      hospitalName: input.hospitalName,
      reason: input.reason,
      notes: input.notes,
      status: input.status ?? FOLLOW_UP_STATUS.UPCOMING,
    },
  });

  return NextResponse.json(followUp, { status: 201 });
}
