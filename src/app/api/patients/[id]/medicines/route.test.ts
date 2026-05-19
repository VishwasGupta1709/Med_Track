import { afterEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => ({
  patientFindFirst: vi.fn(),
  medicineFindMany: vi.fn(),
  medicineCreate: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    patient: {
      findFirst: prismaMocks.patientFindFirst,
    },
    medicine: {
      findMany: prismaMocks.medicineFindMany,
      create: prismaMocks.medicineCreate,
    },
  },
}));

import { POST } from "./route";

function createPayload(overrides: Record<string, unknown> = {}) {
  return {
    name: "Paracetamol",
    dosage: "500 mg",
    form: "Tablet",
    frequency: "Once daily",
    foodInstruction: "After food",
    instructions: "Care note",
    startDate: "2026-05-16",
    endDate: "2026-05-20",
    timings: [{ label: "Morning", timeOfDay: "09:00" }],
    ...overrides,
  };
}

function createRequest(body: unknown = createPayload()) {
  return new Request("http://localhost/api/patients/patient-1/medicines", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createContext() {
  return {
    params: Promise.resolve({ id: "patient-1" }),
  };
}

describe("create medicine route", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("rejects mismatched frequency and timing count", async () => {
    prismaMocks.patientFindFirst.mockResolvedValueOnce({ id: "patient-1" });

    const response = await POST(
      createRequest(createPayload({ frequency: "2", timings: [{ timeOfDay: "09:00" }] })),
      createContext(),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      errors: {
        timings: "Frequency is 2 times daily, so please add exactly 2 timings.",
      },
    });
    expect(prismaMocks.medicineCreate).not.toHaveBeenCalled();
  });
});
