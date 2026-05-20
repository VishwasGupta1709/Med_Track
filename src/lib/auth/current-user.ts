import type { User as LocalUser } from "@prisma/client";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function upsertCurrentUserFromClerk(): Promise<LocalUser | null> {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    return null;
  }

  const primaryEmail =
    clerkUser.emailAddresses.find((email) => email.id === clerkUser.primaryEmailAddressId)
      ?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;
  const displayName =
    clerkUser.fullName ||
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    clerkUser.username ||
    null;

  return prisma.user.upsert({
    where: { clerkUserId: clerkUser.id },
    create: {
      clerkUserId: clerkUser.id,
      email: primaryEmail ?? null,
      displayName,
    },
    update: {
      email: primaryEmail ?? null,
      displayName,
    },
  });
}

export async function getCurrentUser(): Promise<LocalUser | null> {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  return upsertCurrentUserFromClerk();
}

export async function requireCurrentUser(): Promise<LocalUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Authentication required.");
  }

  return user;
}
