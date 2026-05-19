import { afterEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => ({
  patientFindFirst: vi.fn(),
  bpReadingFindFirst: vi.fn(),
  bpReadingUpdate: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    patient: {
      findFirst: prismaMocks.patientFindFirst,
    },
    bPReading: {
      findFirst: prismaMocks.bpReadingFindFirst,
      update: prismaMocks.bpReadingUpdate,
    },
  },
}));

import { PATCH } from "./route";

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

function createRequest(body: unknown = createPayload()) {
  return new Request("http://localhost/api/patients/patient-1/bp-readings/bp-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createContext(readingId = "bp-1") {
  return {
    params: Promise.resolve({ id: "patient-1", readingId }),
  };
}

describe("edit BP reading route", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 when the patient is missing or not owned", async () => {
    prismaMocks.patientFindFirst.mockResolvedValueOnce(null);

    const response = await PATCH(createRequest(), createContext());

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Patient not found." });
    expect(prismaMocks.patientFindFirst).toHaveBeenCalledWith({
      where: {
        id: "patient-1",
        createdByUserId: "demo-user",
      },
      select: { id: true },
    });
    expect(prismaMocks.bpReadingFindFirst).not.toHaveBeenCalled();
    expect(prismaMocks.bpReadingUpdate).not.toHaveBeenCalled();
  });

  it("returns 404 when the BP reading is missing or belongs to another patient", async () => {
    prismaMocks.patientFindFirst.mockResolvedValueOnce({ id: "patient-1" });
    prismaMocks.bpReadingFindFirst.mockResolvedValueOnce(null);

    const response = await PATCH(createRequest(), createContext());

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "BP reading not found." });
    expect(prismaMocks.bpReadingFindFirst).toHaveBeenCalledWith({
      where: {
        id: "bp-1",
        patientId: "patient-1",
      },
      select: { id: true },
    });
    expect(prismaMocks.bpReadingUpdate).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid BP input", async () => {
    prismaMocks.patientFindFirst.mockResolvedValueOnce({ id: "patient-1" });
    prismaMocks.bpReadingFindFirst.mockResolvedValueOnce({ id: "bp-1" });

    const response = await PATCH(createRequest(createPayload({ systolic: "301" })), createContext());

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      errors: {
        systolic: "Systolic reading must be between 1 and 300.",
      },
    });
    expect(prismaMocks.bpReadingUpdate).not.toHaveBeenCalled();
  });

  it("updates valid BP reading fields", async () => {
    const updatedReading = {
      id: "bp-1",
      patientId: "patient-1",
      systolic: 122,
      diastolic: 82,
      pulse: 74,
      measuredAt: new Date("2026-05-16T10:45:00.000Z"),
      notes: "Updated note",
    };

    prismaMocks.patientFindFirst.mockResolvedValueOnce({ id: "patient-1" });
    prismaMocks.bpReadingFindFirst.mockResolvedValueOnce({ id: "bp-1" });
    prismaMocks.bpReadingUpdate.mockResolvedValueOnce(updatedReading);

    const response = await PATCH(
      createRequest(
        createPayload({
          systolic: "122",
          diastolic: "82",
          pulse: "74",
          measuredAt: "2026-05-16T10:45",
          notes: "Updated note",
        }),
      ),
      createContext(),
    );

    expect(response.status).toBe(200);
    expect(prismaMocks.bpReadingUpdate).toHaveBeenCalledWith({
      where: { id: "bp-1" },
      data: {
        systolic: 122,
        diastolic: 82,
        pulse: 74,
        measuredAt: new Date("2026-05-16T10:45"),
        notes: "Updated note",
      },
    });
    expect(await response.json()).toEqual({
      ...updatedReading,
      measuredAt: updatedReading.measuredAt.toISOString(),
    });
  });

  it("uses the route patient id and reading id in ownership and update checks", async () => {
    prismaMocks.patientFindFirst.mockResolvedValueOnce({ id: "patient-1" });
    prismaMocks.bpReadingFindFirst.mockResolvedValueOnce({ id: "bp-2" });
    prismaMocks.bpReadingUpdate.mockResolvedValueOnce({
      id: "bp-2",
      patientId: "patient-1",
      systolic: 120,
      diastolic: 80,
      pulse: null,
      measuredAt: new Date("2026-05-16T10:30:00.000Z"),
      notes: null,
    });

    await PATCH(createRequest(), createContext("bp-2"));

    expect(prismaMocks.bpReadingFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "bp-2",
          patientId: "patient-1",
        },
      }),
    );
    expect(prismaMocks.bpReadingUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "bp-2" },
      }),
    );
  });

  it("allows optional pulse and notes to be cleared", async () => {
    const updatedReading = {
      id: "bp-1",
      patientId: "patient-1",
      systolic: 120,
      diastolic: 80,
      pulse: null,
      measuredAt: new Date("2026-05-16T10:30:00.000Z"),
      notes: null,
    };

    prismaMocks.patientFindFirst.mockResolvedValueOnce({ id: "patient-1" });
    prismaMocks.bpReadingFindFirst.mockResolvedValueOnce({ id: "bp-1" });
    prismaMocks.bpReadingUpdate.mockResolvedValueOnce(updatedReading);

    const response = await PATCH(
      createRequest(createPayload({ pulse: "", notes: "   " })),
      createContext(),
    );

    expect(response.status).toBe(200);
    expect(prismaMocks.bpReadingUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          pulse: null,
          notes: null,
        }),
      }),
    );
  });
});
