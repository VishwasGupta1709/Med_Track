import { NextResponse } from "next/server";
import { skipDoseEventAction } from "@/lib/dose-event-actions";
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

  const updateResult = await skipDoseEventAction(prisma, id, DEMO_USER_ID, input);

  if (!updateResult.updated) {
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
