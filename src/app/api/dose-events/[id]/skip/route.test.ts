import { afterEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  updateMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    doseEvent: {
      findFirst: prismaMocks.findFirst,
      updateMany: prismaMocks.updateMany,
    },
  },
}));

import { POST } from "./route";

function createRequest(body: unknown) {
  return new Request("http://localhost/api/dose-events/dose-1/skip", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createContext() {
  return {
    params: Promise.resolve({ id: "dose-1" }),
  };
}

describe("skip dose event route", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for an invalid skipped reason", async () => {
    const response = await POST(
      createRequest({ skippedReason: "a".repeat(501) }),
      createContext(),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      errors: {
        skippedReason: "Skipped reason must be 500 characters or less.",
      },
    });
    expect(prismaMocks.findFirst).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid confirmation note", async () => {
    const response = await POST(
      createRequest({ confirmationNote: "a".repeat(501) }),
      createContext(),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      errors: {
        confirmationNote: "Confirmation note must be 500 characters or less.",
      },
    });
    expect(prismaMocks.findFirst).not.toHaveBeenCalled();
  });

  it("returns 404 when the dose event is missing or belongs to another user", async () => {
    prismaMocks.findFirst.mockResolvedValueOnce(null);

    const response = await POST(createRequest({}), createContext());

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Dose event not found." });
    expect(prismaMocks.findFirst).toHaveBeenCalledWith({
      where: {
        id: "dose-1",
        patient: {
          createdByUserId: "demo-user",
        },
      },
      select: { id: true },
    });
    expect(prismaMocks.updateMany).not.toHaveBeenCalled();
  });

  it("returns 409 when the dose event can no longer be skipped", async () => {
    prismaMocks.findFirst.mockResolvedValueOnce({ id: "dose-1" });
    prismaMocks.updateMany.mockResolvedValueOnce({ count: 0 });

    const response = await POST(createRequest({}), createContext());

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "Dose event can no longer be skipped.",
    });
  });

  it("returns the updated dose event after a successful skip", async () => {
    const updatedDoseEvent = {
      id: "dose-1",
      status: "SKIPPED",
      skippedReason: "Away from home",
    };
    prismaMocks.findFirst
      .mockResolvedValueOnce({ id: "dose-1" })
      .mockResolvedValueOnce(updatedDoseEvent);
    prismaMocks.updateMany.mockResolvedValueOnce({ count: 1 });

    const response = await POST(
      createRequest({ skippedReason: "Away from home" }),
      createContext(),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(updatedDoseEvent);
    expect(prismaMocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "dose-1",
        }),
        data: expect.objectContaining({
          status: "SKIPPED",
          confirmedByUserId: "demo-user",
          skippedReason: "Away from home",
        }),
      }),
    );
  });
});
