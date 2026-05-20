import type { PatientMember, PatientRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function getPatientMembership(
  patientId: string,
  userId: string,
): Promise<PatientMember | null> {
  return prisma.patientMember.findUnique({
    where: {
      patientId_userId: {
        patientId,
        userId,
      },
    },
  });
}

export async function requirePatientMembership(
  patientId: string,
  userId: string,
): Promise<PatientMember> {
  const membership = await getPatientMembership(patientId, userId);

  if (!membership) {
    throw new Error("Patient access required.");
  }

  return membership;
}

export function hasPatientRole(role: PatientRole, allowedRoles: PatientRole[]) {
  return allowedRoles.includes(role);
}
