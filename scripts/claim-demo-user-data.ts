import { PatientRole, PrismaClient } from "@prisma/client";

const DEMO_USER_ID = "demo-user";

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_CLAIM !== "true") {
    throw new Error("Refusing to claim demo-user data in production without ALLOW_DEMO_CLAIM=true.");
  }

  const clerkUserId = process.env.CLERK_USER_ID?.trim();

  if (!clerkUserId) {
    throw new Error("Set CLERK_USER_ID to the Clerk user id that should claim local demo data.");
  }

  const prisma = new PrismaClient();

  try {
    const user = await prisma.user.upsert({
      where: { clerkUserId },
      create: {
        clerkUserId,
        email: process.env.CLERK_USER_EMAIL?.trim() || null,
        displayName: process.env.CLERK_USER_DISPLAY_NAME?.trim() || null,
      },
      update: {
        email: process.env.CLERK_USER_EMAIL?.trim() || undefined,
        displayName: process.env.CLERK_USER_DISPLAY_NAME?.trim() || undefined,
      },
    });

    const demoPatients = await prisma.patient.findMany({
      where: { createdByUserId: DEMO_USER_ID },
      select: { id: true },
    });

    let createdMemberships = 0;
    let existingMemberships = 0;

    for (const patient of demoPatients) {
      const existingMembership = await prisma.patientMember.findUnique({
        where: {
          patientId_userId: {
            patientId: patient.id,
            userId: user.id,
          },
        },
        select: { id: true },
      });

      if (existingMembership) {
        existingMemberships += 1;
        continue;
      }

      await prisma.patientMember.create({
        data: {
          patientId: patient.id,
          userId: user.id,
          role: PatientRole.PRIMARY_CAREGIVER,
        },
      });
      createdMemberships += 1;
    }

    console.log(`Demo patients found: ${demoPatients.length}`);
    console.log(`Memberships created: ${createdMemberships}`);
    console.log(`Memberships already present: ${existingMemberships}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
