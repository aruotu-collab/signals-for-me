import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md">
      <div className="card mt-8 p-7">
        <div className="text-xs uppercase tracking-wide text-slate-500">Signals For Me</div>
        <h1 className="mt-1 text-2xl font-bold text-white">Sign in</h1>
        <p className="mt-2 text-sm text-slate-400">
          Enter your email and we&apos;ll send you a magic link — no password needed.
        </p>
        <Suspense fallback={<div className="mt-6 text-sm text-slate-500">Loading…</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
