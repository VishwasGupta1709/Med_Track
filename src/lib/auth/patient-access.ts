import { PatientRole, type PatientMember } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const VIEW_PATIENT_ROLES = [
  PatientRole.PRIMARY_CAREGIVER,
  PatientRole.CAREGIVER,
  PatientRole.VIEWER,
] as const;
export const EDIT_PATIENT_ROLES = [PatientRole.PRIMARY_CAREGIVER] as const;
export const MANAGE_MEDICINE_ROLES = [PatientRole.PRIMARY_CAREGIVER] as const;
export const TRACK_DOSE_ROLES = [PatientRole.PRIMARY_CAREGIVER, PatientRole.CAREGIVER] as const;
export const TRACK_HEALTH_ROLES = [PatientRole.PRIMARY_CAREGIVER, PatientRole.CAREGIVER] as const;

export class PatientAccessError extends Error {
  constructor(
    message: string,
    public readonly code: "PATIENT_ACCESS_REQUIRED" | "PATIENT_ROLE_REQUIRED",
  ) {
    super(message);
    this.name = "PatientAccessError";
  }
}

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
  allowedRoles?: readonly PatientRole[],
): Promise<PatientMember> {
  const membership = await getPatientMembership(patientId, userId);

  if (!membership) {
    throw new PatientAccessError("Patient access required.", "PATIENT_ACCESS_REQUIRED");
  }

  if (allowedRoles && !hasPatientRole(membership.role, allowedRoles)) {
    throw new PatientAccessError("Patient role not permitted.", "PATIENT_ROLE_REQUIRED");
  }

  return membership;
}

export function hasPatientRole(role: PatientRole, allowedRoles: readonly PatientRole[]) {
  return allowedRoles.includes(role);
}
