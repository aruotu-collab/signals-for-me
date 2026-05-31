"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useSearchParams } from "next/navigation";

export function LoginForm() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/onboarding";
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    params.get("check") ? "sent" : "idle",
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
        <div className="mt-2 text-xs text-slate-400">
          In local dev (no email provider configured), the link is printed in the server console.
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-3">
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
