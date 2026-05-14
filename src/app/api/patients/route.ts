import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validatePatientInput } from "@/lib/patient-validation";

const DEMO_USER_ID = "demo-user";

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
  const patients = await prisma.patient.findMany({
    where: { createdByUserId: DEMO_USER_ID },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(patients);
}

export async function POST(request: Request) {
  const input = normalizePatientBody(await request.json().catch(() => null));
  const validation = validatePatientInput(input);

  if (!validation.isValid) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 });
  }

  const patient = await prisma.patient.create({
    data: {
      ...input,
      createdByUserId: DEMO_USER_ID,
    },
  });

  return NextResponse.json(patient, { status: 201 });
}
