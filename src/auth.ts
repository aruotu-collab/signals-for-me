import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { sendVerificationRequest } from "@/lib/auth/sendVerificationRequest";

// Auth.js (NextAuth v5) configuration.
//
// Passwordless email magic links backed by the Prisma adapter. Delivery is
// handled by our own `sendVerificationRequest` (Resend in prod, console in dev),
// so no SMTP server is required and the flow works offline during development.
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  pages: { signIn: "/login", verifyRequest: "/login?check=1", error: "/login" },
  providers: [
    {
      id: "email",
      type: "email",
      name: "Email",
      from: process.env.DIGEST_FROM || "onboarding@resend.dev",
      server: {},
      maxAge: 24 * 60 * 60, // magic link valid for 24h
      options: {},
      sendVerificationRequest,
    },
  ],
  callbacks: {
    // Expose the user id (and a few profile fields) on the session object so
    // server code can resolve the current user without an extra query.
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.audience = (user as { audience?: string }).audience ?? "business";
        session.user.plan = (user as { plan?: string }).plan ?? "free";
      }
      return session;
    },
  },
});
