import { prisma } from "@/lib/db";

// Lightweight demo identity. In production replace with Clerk/Supabase Auth and
// derive the user from the session. Here we resolve a single seeded demo user so
// the personalized feed + digest work without a login flow.
export const DEMO_EMAIL = "nelson@signalsforme.app";

export async function getDemoUser() {
  return prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
    include: { subscriptions: true },
  });
}
