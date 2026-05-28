import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const patient = await prisma.patient.findFirst({
    where: {
      id,
      members: {
        some: {
          userId: user.id,
        },
      },
    },
  });

  if (!patient) {
    return NextResponse.json({ error: "Patient not found." }, { status: 404 });
  }

  return NextResponse.json(patient);
}
