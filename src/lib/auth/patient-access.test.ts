import { afterEach, describe, expect, it, vi } from "vitest";
import { PatientRole } from "@prisma/client";

const prismaMocks = vi.hoisted(() => ({
  patientMemberFindUnique: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    patientMember: {
      findUnique: prismaMocks.patientMemberFindUnique,
    },
  },
}));

import {
  EDIT_PATIENT_ROLES,
  getPatientMembership,
  hasPatientRole,
  PatientAccessError,
  requirePatientMembership,
  TRACK_DOSE_ROLES,
  TRACK_HEALTH_ROLES,
  VIEW_PATIENT_ROLES,
} from "./patient-access";

describe("patient access helpers", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("looks up patient membership by patient and user", async () => {
    const membership = {
      id: "membership-1",
      patientId: "patient-1",
      userId: "user-1",
      role: PatientRole.PRIMARY_CAREGIVER,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    prismaMocks.patientMemberFindUnique.mockResolvedValueOnce(membership);

    await expect(getPatientMembership("patient-1", "user-1")).resolves.toBe(membership);
    expect(prismaMocks.patientMemberFindUnique).toHaveBeenCalledWith({
      where: {
        patientId_userId: {
          patientId: "patient-1",
          userId: "user-1",
        },
      },
    });
  });

  it("requires patient membership clearly", async () => {
    prismaMocks.patientMemberFindUnique.mockResolvedValueOnce(null);

    await expect(requirePatientMembership("patient-1", "user-1")).rejects.toThrow(
      "Patient access required.",
    );
    prismaMocks.patientMemberFindUnique.mockResolvedValueOnce(null);
    await expect(requirePatientMembership("patient-1", "user-1")).rejects.toBeInstanceOf(
      PatientAccessError,
    );
  });

  it("checks whether a role is allowed", () => {
    expect(
      hasPatientRole(PatientRole.CAREGIVER, [
        PatientRole.PRIMARY_CAREGIVER,
        PatientRole.CAREGIVER,
      ]),
    ).toBe(true);
    expect(hasPatientRole(PatientRole.VIEWER, [PatientRole.PRIMARY_CAREGIVER])).toBe(false);
  });

  it("defines shared role sets for patient permissions", () => {
    expect(VIEW_PATIENT_ROLES).toEqual([
      PatientRole.PRIMARY_CAREGIVER,
      PatientRole.CAREGIVER,
      PatientRole.VIEWER,
    ]);
    expect(EDIT_PATIENT_ROLES).toEqual([PatientRole.PRIMARY_CAREGIVER]);
    expect(TRACK_DOSE_ROLES).toEqual([PatientRole.PRIMARY_CAREGIVER, PatientRole.CAREGIVER]);
    expect(TRACK_HEALTH_ROLES).toEqual([PatientRole.PRIMARY_CAREGIVER, PatientRole.CAREGIVER]);
  });

  it("allows memberships with an accepted role", async () => {
    const membership = {
      id: "membership-1",
      patientId: "patient-1",
      userId: "user-1",
      role: PatientRole.VIEWER,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    prismaMocks.patientMemberFindUnique.mockResolvedValueOnce(membership);

    await expect(
      requirePatientMembership("patient-1", "user-1", VIEW_PATIENT_ROLES),
    ).resolves.toBe(membership);
  });

  it("rejects memberships with an insufficient role", async () => {
    const membership = {
      id: "membership-1",
      patientId: "patient-1",
      userId: "user-1",
      role: PatientRole.VIEWER,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    prismaMocks.patientMemberFindUnique.mockResolvedValueOnce(membership);

    await expect(
      requirePatientMembership("patient-1", "user-1", EDIT_PATIENT_ROLES),
    ).rejects.toMatchObject({
      code: "PATIENT_ROLE_REQUIRED",
      message: "Patient role not permitted.",
    });
  });
});
