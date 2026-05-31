import Link from "next/link";
import type { SignalDTO } from "@/lib/types";
import type { OpportunityResult } from "@/lib/opportunity";
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

export function SignalCard({
  signal,
  opportunity,
}: {
  signal: SignalDTO;
  opportunity?: OpportunityResult;
}) {
  return (
    <article className="card group p-5 transition hover:border-brand-400/40 hover:shadow-glow">
      {opportunity && <OpportunityBanner opp={opportunity} />}
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
      <p className="mt-1.5 text-sm text-slate-400">{signal.whatChanged ?? signal.summary}</p>

      {(bizCount(signal) > 0 || consCount(signal) > 0 || signal.risks.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {bizCount(signal) > 0 && (
            <span className="chip border border-brand-400/30 bg-brand-500/10 text-brand-200">
              {bizCount(signal)} business {plural(bizCount(signal), "opportunity", "opportunities")}
            </span>
          )}
          {consCount(signal) > 0 && (
            <span className="chip border border-signal-consumer/30 bg-signal-consumer/10 text-signal-consumer">
              {consCount(signal)} consumer {plural(consCount(signal), "opportunity", "opportunities")}
            </span>
          )}
          {signal.risks.length > 0 && (
            <span className="chip border border-signal-distress/30 bg-signal-distress/10 text-signal-distress">
              {signal.risks.length} {plural(signal.risks.length, "risk", "risks")}
            </span>
          )}
        </div>
      )}

      {signal.opportunities.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {signal.opportunities.slice(0, 3).map((o, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
              <span
                className={`chip shrink-0 ${
                  o.audience === "consumer"
                    ? "bg-signal-consumer/10 text-signal-consumer"
                    : "bg-brand-500/10 text-brand-200"
                }`}
              >
                {o.audience === "consumer" ? "Consumer" : "Business"}
              </span>
              <span className="truncate">{o.title}</span>
              <span className="ml-auto shrink-0 text-xs text-slate-500">
                {Math.round(o.confidence * 100)}%
              </span>
            </li>
          ))}
        </ul>
      )}

      {signal.opportunities.length > 3 && (
        <Link href={`/signals/${signal.id}`} className="mt-2 inline-block text-xs text-brand-300 hover:underline">
          +{signal.opportunities.length - 3} more opportunities
        </Link>
      )}
    </article>
  );
}

function OpportunityBanner({ opp }: { opp: OpportunityResult }) {
  const accent = opp.defensive ? "text-signal-distress" : "text-signal-growth";
  const border = opp.defensive ? "border-signal-distress/30 bg-signal-distress/[0.06]" : "border-signal-growth/30 bg-signal-growth/[0.06]";
  return (
    <div className={`mb-3 rounded-xl border ${border} p-3`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {opp.label}
          </div>
          <div className={`text-lg font-bold ${accent}`}>{opp.revenueLabel}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className={`text-xl font-bold ${accent}`}>{opp.score}</div>
          <div className="text-[10px] uppercase tracking-wide text-slate-500">opp. score</div>
        </div>
      </div>
      <p className="mt-1.5 break-words text-xs text-slate-300">
        <span className="font-medium text-slate-200">Action:</span> {opp.action}
      </p>
    </div>
  );
}

function bizCount(s: SignalDTO): number {
  return s.opportunities.filter((o) => o.audience === "business").length;
}

function consCount(s: SignalDTO): number {
  return s.opportunities.filter((o) => o.audience === "consumer").length;
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
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
