"use client";

import { useState, useTransition } from "react";
import { castVote } from "@/app/ideas/actions";
import type { VoteKind } from "@/lib/demand";
import type { UserLocation } from "@/lib/location";
import { LocationCapture } from "@/components/LocationCapture";

const VOTE_OPTIONS: { kind: VoteKind; label: string; emoji: string; description: string }[] = [
  { kind: "like", label: "Want this", emoji: "👍", description: "I'd like this to exist" },
  { kind: "need", label: "Need this", emoji: "🔥", description: "I really need this" },
  { kind: "would_pay", label: "Would pay", emoji: "💰", description: "I'd pay for this" },
  { kind: "local", label: "In my area", emoji: "📍", description: "Available near me" },
  { kind: "waitlist", label: "Join waitlist", emoji: "✅", description: "Notify me when it launches" },
];

export function VotePanel({
  ideaId,
  existingVotes = [],
  signedIn,
  hasLocation,
  initialLocation,
}: {
  ideaId: string;
  existingVotes?: string[];
  signedIn: boolean;
  hasLocation: boolean;
  initialLocation?: Partial<UserLocation> | null;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(existingVotes));
  const [showDetails, setShowDetails] = useState(false);
  const [priceBand, setPriceBand] = useState("");
  const [frequency, setFrequency] = useState("");
  const [urgency, setUrgency] = useState("");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [locationReady, setLocationReady] = useState(hasLocation);

  function toggle(kind: VoteKind) {
    if (!signedIn) {
      window.location.href = `/login?callbackUrl=/ideas/${ideaId}`;
      return;
    }
    if (!locationReady) {
      setMessage("Add your location above before voting.");
      return;
    }

    const next = new Set(selected);
    if (next.has(kind)) next.delete(kind);
    else next.add(kind);
    setSelected(next);

    if (kind === "would_pay" || kind === "waitlist") setShowDetails(true);

    startTransition(async () => {
      const result = await castVote({
        ideaId,
        kind,
        remove: selected.has(kind),
        priceBand: priceBand || undefined,
        frequency: frequency || undefined,
        urgency: urgency || undefined,
      });
      if (result.error) setMessage(result.error);
      else setMessage("Vote recorded!");
      setTimeout(() => setMessage(""), 2000);
    });
  }

  return (
    <div className="space-y-4">
      {signedIn && !locationReady && (
        <LocationCapture
          compact
          initial={initialLocation}
          onSaved={() => {
            setLocationReady(true);
            setMessage("Location saved — you can vote now.");
            setTimeout(() => setMessage(""), 2500);
          }}
        />
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {VOTE_OPTIONS.map((opt) => {
          const active = selected.has(opt.kind);
          return (
            <button
              key={opt.kind}
              type="button"
              disabled={pending || (signedIn && !locationReady)}
              onClick={() => toggle(opt.kind)}
              className={`rounded-xl border p-3 text-left transition ${
                active
                  ? "border-brand-400/50 bg-brand-500/15 ring-1 ring-brand-400/30"
                  : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/5"
              } ${signedIn && !locationReady ? "opacity-60" : ""}`}
            >
              <div className="text-xl">{opt.emoji}</div>
              <div className="mt-1 text-sm font-semibold text-white">{opt.label}</div>
              <div className="mt-0.5 text-xs text-slate-500">{opt.description}</div>
            </button>
          );
        })}
      </div>

      {(showDetails || selected.has("would_pay") || selected.has("waitlist")) && locationReady && (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="text-sm font-semibold text-white">Help businesses understand your demand</div>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="text-xs text-slate-400">How much would you pay?</span>
              <select
                value={priceBand}
                onChange={(e) => setPriceBand(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white"
              >
                <option value="">Select…</option>
                <option value="10">£10</option>
                <option value="20">£20</option>
                <option value="30">£30</option>
                <option value="40+">£40+</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-slate-400">How often?</span>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white"
              >
                <option value="">Select…</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="once">Once</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-slate-400">How urgently?</span>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white"
              >
                <option value="">Select…</option>
                <option value="nice">Nice to have</option>
                <option value="useful">Useful</option>
                <option value="urgent">Need now</option>
              </select>
            </label>
          </div>
        </div>
      )}

      {message && <p className="text-sm text-brand-300">{message}</p>}
      {!signedIn && (
        <p className="text-sm text-slate-500">
          <a href={`/login?callbackUrl=/ideas/${ideaId}`} className="text-brand-300 underline">
            Sign in
          </a>{" "}
          to vote and shape what gets built.
        </p>
      )}
    </div>
  );
}
