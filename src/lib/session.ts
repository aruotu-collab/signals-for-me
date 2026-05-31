import { auth } from "@/auth";
import { prisma } from "@/lib/db";

// Resolves the currently signed-in user (with subscriptions) from the Auth.js
// session, or null if no one is signed in.
export async function getCurrentUser() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  return prisma.user.findUnique({
    where: { id },
    include: { subscriptions: true },
  });
}
