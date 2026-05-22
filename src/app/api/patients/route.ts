import { NextResponse } from "next/server";
import { PatientRole } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { validatePatientInput } from "@/lib/patient-validation";

function normalizePatientBody(body: unknown) {
  const data = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const parsedAge =
    data.age === "" || data.age === null || data.age === undefined ? null : Number(data.age);

  return {
    fullName: typeof data.fullName === "string" ? data.fullName.trim() : "",
    age: Number.isFinite(parsedAge) ? parsedAge : null,
    relationship:
      typeof data.relationship === "string" && data.relationship.trim()
        ? data.relationship.trim()
        : null,
    phoneNumber:
      typeof data.phoneNumber === "string" && data.phoneNumber.trim()
        ? data.phoneNumber.trim()
        : null,
    notes: typeof data.notes === "string" && data.notes.trim() ? data.notes.trim() : null,
  };
}

export async function GET() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const patients = await prisma.patient.findMany({
    where: {
      members: {
        some: {
          userId: currentUser.id,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(patients);
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const input = normalizePatientBody(await request.json().catch(() => null));
  const validation = validatePatientInput(input);

  if (!validation.isValid) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 });
  }

  const patient = await prisma.$transaction(async (tx) => {
    const createdPatient = await tx.patient.create({
      data: {
        ...input,
        createdByUserId: currentUser.id,
      },
    });

    await tx.patientMember.create({
      data: {
        patientId: createdPatient.id,
        userId: currentUser.id,
        role: PatientRole.PRIMARY_CAREGIVER,
      },
    });

    return createdPatient;
  });

  return NextResponse.json(patient, { status: 201 });
}
