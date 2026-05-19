import { afterEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => ({
  patientFindFirst: vi.fn(),
  bpReadingFindMany: vi.fn(),
  bpReadingCreate: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    patient: {
      findFirst: prismaMocks.patientFindFirst,
    },
    bPReading: {
      findMany: prismaMocks.bpReadingFindMany,
      create: prismaMocks.bpReadingCreate,
    },
  },
}));

import { GET, POST } from "./route";

function createPayload(overrides: Record<string, unknown> = {}) {
  return {
    systolic: "120",
    diastolic: "80",
    pulse: "72",
    measuredAt: "2026-05-16T10:30",
    notes: "Care note",
    ...overrides,
  };
}

function createPostRequest(body: unknown = createPayload()) {
  return new Request("http://localhost/api/patients/patient-1/bp-readings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createGetRequest() {
  return new Request("http://localhost/api/patients/patient-1/bp-readings", {
    method: "GET",
  });
}

function createContext() {
  return {
    params: Promise.resolve({ id: "patient-1" }),
  };
}

describe("BP readings route", () => {
  afterEach(() => {
    vi.clearAllMocks();
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
    expect(prismaMocks.bpReadingCreate).not.toHaveBeenCalled();
  });

  it("returns 400 on POST for invalid BP input", async () => {
    prismaMocks.patientFindFirst.mockResolvedValueOnce({ id: "patient-1" });

    const response = await POST(createPostRequest(createPayload({ systolic: "301" })), createContext());

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      errors: {
        systolic: "Systolic reading must be between 1 and 300.",
      },
    });
    expect(prismaMocks.bpReadingCreate).not.toHaveBeenCalled();
  });

  it("creates a BP reading for valid input and uses the route patient id", async () => {
    const createdReading = {
      id: "bp-1",
      patientId: "patient-1",
      systolic: 120,
      diastolic: 80,
      pulse: 72,
      measuredAt: new Date("2026-05-16T10:30:00.000Z"),
      notes: "Care note",
    };

    prismaMocks.patientFindFirst.mockResolvedValueOnce({ id: "patient-1" });
    prismaMocks.bpReadingCreate.mockResolvedValueOnce(createdReading);

    const response = await POST(createPostRequest(), createContext());

    expect(response.status).toBe(201);
    expect(prismaMocks.bpReadingCreate).toHaveBeenCalledWith({
      data: {
        patientId: "patient-1",
        systolic: 120,
        diastolic: 80,
        pulse: 72,
        measuredAt: new Date("2026-05-16T10:30"),
        notes: "Care note",
      },
    });
    expect(await response.json()).toEqual({
      ...createdReading,
      measuredAt: createdReading.measuredAt.toISOString(),
    });
  });

  it("returns 404 on GET when the patient is missing or not owned", async () => {
    prismaMocks.patientFindFirst.mockResolvedValueOnce(null);

    const response = await GET(createGetRequest(), createContext());

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Patient not found." });
    expect(prismaMocks.bpReadingFindMany).not.toHaveBeenCalled();
  });

  it("verifies ownership and queries BP readings newest-first on GET", async () => {
    const readings = [
      {
        id: "bp-1",
        patientId: "patient-1",
        systolic: 120,
        diastolic: 80,
        pulse: null,
        measuredAt: new Date("2026-05-16T10:30:00.000Z"),
        notes: null,
      },
    ];

    prismaMocks.patientFindFirst.mockResolvedValueOnce({ id: "patient-1" });
    prismaMocks.bpReadingFindMany.mockResolvedValueOnce(readings);

    const response = await GET(createGetRequest(), createContext());

    expect(response.status).toBe(200);
    expect(prismaMocks.bpReadingFindMany).toHaveBeenCalledWith({
      where: { patientId: "patient-1" },
      orderBy: { measuredAt: "desc" },
    });
    expect(await response.json()).toEqual([
      {
        ...readings[0],
        measuredAt: readings[0].measuredAt.toISOString(),
      },
    ]);
  });
});
