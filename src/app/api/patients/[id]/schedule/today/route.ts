import { NextResponse } from "next/server";
import { PatientRole } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getPatientMembership, hasPatientRole } from "@/lib/auth/patient-access";
import { prisma } from "@/lib/prisma";
import { getTodayWindow } from "@/lib/schedule-generation";

const SCHEDULE_VIEW_ROLES = [
  PatientRole.PRIMARY_CAREGIVER,
  PatientRole.CAREGIVER,
  PatientRole.VIEWER,
];

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

async function authorizeScheduleView(patientId: string) {
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

  if (!hasPatientRole(membership.role, SCHEDULE_VIEW_ROLES)) {
    return {
      error: NextResponse.json({ error: "Forbidden." }, { status: 403 }),
    };
  }

  return { membership };
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const access = await authorizeScheduleView(id);

  if ("error" in access) {
    return access.error;
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
