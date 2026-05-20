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
  getPatientMembership,
  hasPatientRole,
  requirePatientMembership,
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
});
