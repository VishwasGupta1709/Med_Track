import { NextResponse } from "next/server";
import { ACTIONABLE_DOSE_STATUSES, DOSE_STATUS } from "@/lib/dose-status";
import { prisma } from "@/lib/prisma";
import {
  normalizeDoseEventActionBody,
  validateDoseEventActionInput,
} from "@/lib/dose-event-validation";

const DEMO_USER_ID = "demo-user";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const input = normalizeDoseEventActionBody(await request.json().catch(() => null));
  const validation = validateDoseEventActionInput(input);

  if (!validation.isValid) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 });
  }

  const doseEvent = await prisma.doseEvent.findFirst({
    where: {
      id,
      patient: {
        createdByUserId: DEMO_USER_ID,
      },
    },
    select: { id: true },
  });

  if (!doseEvent) {
    return NextResponse.json({ error: "Dose event not found." }, { status: 404 });
  }

  const updateResult = await prisma.doseEvent.updateMany({
    where: {
      id,
      status: { in: [...ACTIONABLE_DOSE_STATUSES] },
      takenAt: null,
      skippedAt: null,
      missedAt: null,
    },
    data: {
      status: DOSE_STATUS.SKIPPED,
      skippedAt: new Date(),
      takenAt: null,
      missedAt: null,
      confirmedByUserId: DEMO_USER_ID,
      skippedReason: input.skippedReason,
      confirmationNote: input.confirmationNote,
    },
  });

  if (updateResult.count === 0) {
    return NextResponse.json({ error: "Dose event can no longer be skipped." }, { status: 409 });
  }

  const updatedDoseEvent = await prisma.doseEvent.findFirst({
    where: {
      id,
      patient: {
        createdByUserId: DEMO_USER_ID,
      },
    },
  });

  return NextResponse.json(updatedDoseEvent);
}
