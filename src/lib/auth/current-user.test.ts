import { afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
  userUpsert: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMocks.auth,
  currentUser: authMocks.currentUser,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      upsert: authMocks.userUpsert,
    },
  },
}));

import { getCurrentUser, requireCurrentUser, upsertCurrentUserFromClerk } from "./current-user";

describe("current user auth helpers", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no Clerk user is signed in", async () => {
    authMocks.auth.mockResolvedValueOnce({ userId: null });

    await expect(getCurrentUser()).resolves.toBeNull();
    expect(authMocks.currentUser).not.toHaveBeenCalled();
    expect(authMocks.userUpsert).not.toHaveBeenCalled();
  });

  it("requires a signed-in user clearly", async () => {
    authMocks.auth.mockResolvedValueOnce({ userId: null });

    await expect(requireCurrentUser()).rejects.toThrow("Authentication required.");
  });

  it("upserts a local user from Clerk profile data", async () => {
    const localUser = {
      id: "user-1",
      clerkUserId: "clerk-user-1",
      email: "caregiver@example.com",
      displayName: "Care Giver",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    authMocks.currentUser.mockResolvedValueOnce({
      id: "clerk-user-1",
      emailAddresses: [
        { id: "email-1", emailAddress: "caregiver@example.com" },
        { id: "email-2", emailAddress: "secondary@example.com" },
      ],
      primaryEmailAddressId: "email-1",
      fullName: "Care Giver",
      firstName: "Care",
      lastName: "Giver",
      username: null,
    });
    authMocks.userUpsert.mockResolvedValueOnce(localUser);

    await expect(upsertCurrentUserFromClerk()).resolves.toBe(localUser);
    expect(authMocks.userUpsert).toHaveBeenCalledWith({
      where: { clerkUserId: "clerk-user-1" },
      create: {
        clerkUserId: "clerk-user-1",
        email: "caregiver@example.com",
        displayName: "Care Giver",
      },
      update: {
        email: "caregiver@example.com",
        displayName: "Care Giver",
      },
    });
  });

  it("gets the signed-in Clerk user and returns the local user", async () => {
    const localUser = {
      id: "user-1",
      clerkUserId: "clerk-user-1",
      email: null,
      displayName: "caregiver",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    authMocks.auth.mockResolvedValueOnce({ userId: "clerk-user-1" });
    authMocks.currentUser.mockResolvedValueOnce({
      id: "clerk-user-1",
      emailAddresses: [],
      primaryEmailAddressId: null,
      fullName: null,
      firstName: null,
      lastName: null,
      username: "caregiver",
    });
    authMocks.userUpsert.mockResolvedValueOnce(localUser);

    await expect(getCurrentUser()).resolves.toBe(localUser);
    expect(authMocks.userUpsert).toHaveBeenCalledWith({
      where: { clerkUserId: "clerk-user-1" },
      create: {
        clerkUserId: "clerk-user-1",
        email: null,
        displayName: "caregiver",
      },
      update: {
        email: null,
        displayName: "caregiver",
      },
    });
  });
});
