"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

// Renders sign-in / account controls in the nav. The signed-in email is passed
// from the server component so we don't need a client SessionProvider.
export function AuthButtons({ email }: { email: string | null }) {
  if (!email) {
    return (
      <Link
        href="/login"
        className="rounded-lg px-2 py-2 text-slate-300 hover:bg-white/5 hover:text-white sm:px-3"
      >
        Sign in
      </Link>
    );
  }

  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="rounded-lg px-2 py-2 text-slate-400 hover:bg-white/5 hover:text-white sm:px-3"
      title={email}
    >
      Sign out
    </button>
  );
}
