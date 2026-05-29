import Link from "next/link";
import type { SignalDTO } from "@/lib/types";
import { ConfidenceBadge } from "./ConfidenceBadge";

const TYPE_TONE: Record<string, string> = {
  "Funding Signals": "text-signal-funding bg-signal-funding/10 border-signal-funding/30",
  "Hiring Signals": "text-signal-hiring bg-signal-hiring/10 border-signal-hiring/30",
  "Growth Signals": "text-signal-growth bg-signal-growth/10 border-signal-growth/30",
  "Buying Intent Signals": "text-signal-buying bg-signal-buying/10 border-signal-buying/30",
  "Government Signals": "text-signal-government bg-signal-government/10 border-signal-government/30",
  "Distress Signals": "text-signal-distress bg-signal-distress/10 border-signal-distress/30",
};

function tone(group: string, category: string) {
  return (
    TYPE_TONE[group] ??
    (category === "consumer"
      ? "text-signal-consumer bg-signal-consumer/10 border-signal-consumer/30"
      : "text-brand-300 bg-brand-500/10 border-brand-400/30")
  );
}

export function SignalCard({ signal }: { signal: SignalDTO }) {
  return (
    <article className="card group p-5 transition hover:border-brand-400/40 hover:shadow-glow">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className={`chip border ${tone(signal.groupName, signal.category)}`}>{signal.typeLabel}</span>
        <ConfidenceBadge value={signal.confidence} />
        {signal.entityLocation && (
          <span className="chip bg-white/5 text-slate-400">{signal.entityLocation}</span>
        )}
        <span className="ml-auto text-xs text-slate-500">{timeAgo(signal.detectedAt)}</span>
      </div>

      <Link href={`/signals/${signal.id}`} className="block">
        <h3 className="text-lg font-semibold leading-snug text-white group-hover:text-brand-200">
          {signal.title}
        </h3>
      </Link>
      <p className="mt-1.5 text-sm text-slate-400">{signal.summary}</p>

      {signal.whyItMatters.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {signal.whyItMatters.map((w, i) => (
            <li key={i} className="chip bg-white/5 text-slate-300">
              {w}
            </li>
          ))}
        </ul>
      )}

      {signal.suggestedAction && (
        <div className="mt-3 rounded-xl border border-brand-400/20 bg-brand-500/5 px-3 py-2 text-sm text-brand-200">
          <span className="font-semibold">Suggested action:</span> {signal.suggestedAction}
        </div>
      )}
    </article>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
