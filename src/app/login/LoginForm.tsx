"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useSearchParams } from "next/navigation";

// Map Auth.js error codes (passed as ?error=) to friendly copy.
function authErrorMessage(code: string | null): string | null {
  if (!code) return null;
  switch (code) {
    case "Verification":
      return "That sign-in link was invalid, already used, or expired. Enter your email below to get a fresh one.";
    case "Configuration":
      return "Sign-in is temporarily unavailable. Please try again shortly.";
    default:
      return "We couldn't sign you in. Enter your email below to get a new link.";
  }
}

export function LoginForm() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/onboarding";
  const authError = authErrorMessage(params.get("error"));
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    params.get("check") && !params.get("error") ? "sent" : "idle",
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("sending");
    try {
      await signIn("email", { email, callbackUrl, redirect: false });
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="mt-6 rounded-xl border border-brand-400/20 bg-brand-500/5 p-4 text-sm text-brand-100">
        Check your inbox for a sign-in link. You can close this tab.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-3">
      {authError && (
        <p className="rounded-xl border border-signal-distress/30 bg-signal-distress/10 p-3 text-sm text-signal-distress">
          {authError}
        </p>
      )}
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder:text-slate-500 focus:border-brand-400/50 focus:outline-none"
      />
      <button
        type="submit"
        disabled={status === "sending"}
        className="btn-primary w-full justify-center py-2.5 disabled:opacity-50"
      >
        {status === "sending" ? "Sending link…" : "Email me a sign-in link"}
      </button>
      {status === "error" && (
        <p className="text-sm text-signal-distress">Something went wrong. Please try again.</p>
      )}
    </form>
  );
}
