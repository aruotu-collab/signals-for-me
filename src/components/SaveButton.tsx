"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleSave } from "@/app/shortlist/actions";

export function SaveButton({
  signalId,
  initialSaved,
  className = "",
}: {
  signalId: string;
  initialSaved: boolean;
  className?: string;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, start] = useTransition();
  const router = useRouter();

  function onClick() {
    start(async () => {
      const res = await toggleSave(signalId);
      if (res.needAuth) {
        router.push(`/login?callbackUrl=${encodeURIComponent(`/signals/${signalId}`)}`);
        return;
      }
      setSaved(res.saved);
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={saved}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition disabled:opacity-50 ${
        saved
          ? "border-signal-growth/40 bg-signal-growth/10 text-signal-growth"
          : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
      } ${className}`}
    >
      <span aria-hidden>{saved ? "★" : "☆"}</span>
      {saved ? "Saved" : "Save to compare"}
    </button>
  );
}
