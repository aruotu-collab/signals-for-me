"use client";

import { analyzeJob, formatGbp, type JobIntelInput } from "@/lib/shiply/intelligence";

const VERDICT_STYLES = {
  strong: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  good: "border-sky-500/30 bg-sky-500/10 text-sky-200",
  marginal: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  thin: "border-red-500/20 bg-red-500/5 text-red-200",
} as const;

export function JobIntelligence({ job, compact = false }: { job: JobIntelInput; compact?: boolean }) {
  const intel = analyzeJob(job);
  if (!intel) return null;

  if (compact) {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
        <span className={`chip ${VERDICT_STYLES[intel.verdict]}`}>{intel.verdictLabel}</span>
        <span className="text-slate-500">
          Est. {formatGbp(intel.suggestedBid)} · fuel {formatGbp(intel.fuelCost)} · profit ~{formatGbp(intel.profitAtBid)}
        </span>
      </div>
    );
  }

  return (
    <div className={`mt-3 rounded-xl border p-3 ${VERDICT_STYLES[intel.verdict]}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide opacity-80">Route intelligence</div>
          <div className="mt-0.5 text-sm font-semibold">{intel.verdictLabel}</div>
          <div className="mt-0.5 text-xs opacity-80">{intel.verdictHint}</div>
        </div>
        <div className="text-right text-xs opacity-80">{intel.competitionLabel}</div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <IntelStat label="Est. winning bid" value={formatGbp(intel.suggestedBid)} sub={`${formatGbp(intel.bidLow)}–${formatGbp(intel.bidHigh)} range`} />
        <IntelStat label="Est. fuel" value={formatGbp(intel.fuelCost)} sub={`${intel.fuelLitres}L diesel · ${intel.miles} mi`} />
        <IntelStat
          label="Est. profit"
          value={formatGbp(intel.profitAtBid)}
          sub={`${formatGbp(intel.profitPerMile)}/mi · ${intel.marginPct}% margin`}
        />
        <IntelStat label="Drive time" value={`~${intel.drivingHours}h`} sub={`${formatGbp(intel.ratePerMile)}/mi guide rate`} />
      </div>

      <p className="mt-2 text-[10px] opacity-60">
        Estimates use UK van fuel ({intel.fuelLitres}L), category pricing, and {intel.competition === "high" ? "competition-adjusted" : "route"} bid modelling — not live Shiply quotes.
      </p>
    </div>
  );
}

function IntelStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg bg-black/20 px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wide opacity-70">{label}</div>
      <div className="text-sm font-bold">{value}</div>
      <div className="text-[10px] opacity-70">{sub}</div>
    </div>
  );
}
