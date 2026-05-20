import { afterEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => ({
  patientFindFirst: vi.fn(),
  followUpFindMany: vi.fn(),
  followUpCreate: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    patient: {
      findFirst: prismaMocks.patientFindFirst,
    },
    followUp: {
      findMany: prismaMocks.followUpFindMany,
      create: prismaMocks.followUpCreate,
    },
  },
}));

import { FOLLOW_UP_STATUS } from "@/lib/follow-up-validation";
import { GET, POST } from "./route";

function createPayload(overrides: Record<string, unknown> = {}) {
  return {
    appointmentAt: "2026-05-16T10:30",
    doctorName: "Dr. Rao",
    hospitalName: "City Clinic",
    reason: "Routine follow-up",
    notes: "Bring previous records",
    ...overrides,
  };
}

function createPostRequest(body: unknown = createPayload()) {
  return new Request("http://localhost/api/patients/patient-1/follow-ups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createGetRequest() {
  return new Request("http://localhost/api/patients/patient-1/follow-ups", {
    method: "GET",
  });
}

function createContext() {
  return {
    params: Promise.resolve({ id: "patient-1" }),
  };
}

describe("follow-ups route", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 on GET when the patient is missing or not owned", async () => {
    prismaMocks.patientFindFirst.mockResolvedValueOnce(null);

    const response = await GET(createGetRequest(), createContext());

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Patient not found." });
    expect(prismaMocks.patientFindFirst).toHaveBeenCalledWith({
      where: {
        id: "patient-1",
        createdByUserId: "demo-user",
      },
      select: { id: true },
    });
    expect(prismaMocks.followUpFindMany).not.toHaveBeenCalled();
  });

  it("verifies ownership and queries follow-ups by appointment time ascending on GET", async () => {
    const followUps = [
      {
        id: "follow-up-1",
        patientId: "patient-1",
        appointmentAt: new Date("2026-05-16T10:30:00.000Z"),
        doctorName: "Dr. Rao",
        hospitalName: "City Clinic",
        reason: "Routine follow-up",
        notes: "Bring previous records",
        status: FOLLOW_UP_STATUS.UPCOMING,
      },
    ];

    prismaMocks.patientFindFirst.mockResolvedValueOnce({ id: "patient-1" });
    prismaMocks.followUpFindMany.mockResolvedValueOnce(followUps);

    const response = await GET(createGetRequest(), createContext());

    expect(response.status).toBe(200);
    expect(prismaMocks.followUpFindMany).toHaveBeenCalledWith({
      where: { patientId: "patient-1" },
      orderBy: { appointmentAt: "asc" },
    });
    expect(await response.json()).toEqual([
      {
        ...followUps[0],
        appointmentAt: followUps[0].appointmentAt.toISOString(),
      },
    ]);
  });

  it("returns 404 on POST when the patient is missing or not owned", async () => {
    prismaMocks.patientFindFirst.mockResolvedValueOnce(null);

    const response = await POST(createPostRequest(), createContext());

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Patient not found." });
    expect(prismaMocks.patientFindFirst).toHaveBeenCalledWith({
      where: {
        id: "patient-1",
        createdByUserId: "demo-user",
      },
      select: { id: true },
    });
    expect(prismaMocks.followUpCreate).not.toHaveBeenCalled();
  });

  it("returns 400 on POST for invalid appointmentAt", async () => {
    prismaMocks.patientFindFirst.mockResolvedValueOnce({ id: "patient-1" });

    const response = await POST(
      createPostRequest(createPayload({ appointmentAt: "not-a-date" })),
      createContext(),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      errors: {
        appointmentAt: "Appointment date and time must be a valid date and time.",
      },
    });
    expect(prismaMocks.followUpCreate).not.toHaveBeenCalled();
  });

  it("creates a follow-up using the route patient id", async () => {
    const createdFollowUp = {
      id: "follow-up-1",
      patientId: "patient-1",
      appointmentAt: new Date("2026-05-16T10:30:00.000Z"),
      doctorName: "Dr. Rao",
      hospitalName: "City Clinic",
      reason: "Routine follow-up",
      notes: "Bring previous records",
      status: FOLLOW_UP_STATUS.UPCOMING,
    };

    prismaMocks.patientFindFirst.mockResolvedValueOnce({ id: "patient-1" });
    prismaMocks.followUpCreate.mockResolvedValueOnce(createdFollowUp);

    const response = await POST(createPostRequest(), createContext());

    expect(response.status).toBe(201);
    expect(prismaMocks.followUpCreate).toHaveBeenCalledWith({
      data: {
        patientId: "patient-1",
        appointmentAt: new Date("2026-05-16T10:30"),
        doctorName: "Dr. Rao",
        hospitalName: "City Clinic",
        reason: "Routine follow-up",
        notes: "Bring previous records",
        status: FOLLOW_UP_STATUS.UPCOMING,
      },
    });
    expect(await response.json()).toEqual({
      ...createdFollowUp,
      appointmentAt: createdFollowUp.appointmentAt.toISOString(),
    });
  });

  it("trims and normalizes optional blank fields to null on POST", async () => {
    const createdFollowUp = {
      id: "follow-up-1",
      patientId: "patient-1",
      appointmentAt: new Date("2026-05-16T10:30:00.000Z"),
      doctorName: null,
      hospitalName: null,
      reason: null,
      notes: null,
      status: FOLLOW_UP_STATUS.UPCOMING,
    };

    prismaMocks.patientFindFirst.mockResolvedValueOnce({ id: "patient-1" });
    prismaMocks.followUpCreate.mockResolvedValueOnce(createdFollowUp);

    const response = await POST(
      createPostRequest({
        appointmentAt: " 2026-05-16T10:30 ",
        doctorName: "   ",
        hospitalName: "",
        reason: null,
        notes: undefined,
      }),
      createContext(),
    );

    expect(response.status).toBe(201);
    expect(prismaMocks.followUpCreate).toHaveBeenCalledWith({
      data: {
        patientId: "patient-1",
        appointmentAt: new Date("2026-05-16T10:30"),
        doctorName: null,
        hospitalName: null,
        reason: null,
        notes: null,
        status: FOLLOW_UP_STATUS.UPCOMING,
      },
    });
  });

  it("keeps status UPCOMING on POST when no status is provided", async () => {
    const createdFollowUp = {
      id: "follow-up-1",
      patientId: "patient-1",
      appointmentAt: new Date("2026-05-16T10:30:00.000Z"),
      doctorName: null,
      hospitalName: null,
      reason: null,
      notes: null,
      status: FOLLOW_UP_STATUS.UPCOMING,
    };

    prismaMocks.patientFindFirst.mockResolvedValueOnce({ id: "patient-1" });
    prismaMocks.followUpCreate.mockResolvedValueOnce(createdFollowUp);

    const response = await POST(
      createPostRequest({
        appointmentAt: "2026-05-16T10:30",
      }),
      createContext(),
    );

    expect(response.status).toBe(201);
    expect(prismaMocks.followUpCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: FOLLOW_UP_STATUS.UPCOMING,
      }),
    });
  });
});
