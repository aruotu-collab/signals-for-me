"use client";

import { analyzeJob, formatDriveTime, formatGbp, type JobIntelInput } from "@/lib/shiply/intelligence";
import { useDriverSettings } from "@/lib/shiply/driverSettings";

const VERDICT_STYLES = {
  strong: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  good: "border-sky-500/30 bg-sky-500/10 text-sky-200",
  marginal: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  thin: "border-red-500/20 bg-red-500/5 text-red-200",
} as const;

export function JobIntelligence({ job, compact = false }: { job: JobIntelInput; compact?: boolean }) {
  const { settings } = useDriverSettings();
  const intel = analyzeJob(job, settings);
  if (!intel) return null;

  const rateBadge =
    intel.meetsHourlyRate == null ? null : intel.meetsHourlyRate ? (
      <span className="chip bg-emerald-500/15 text-emerald-200">✓ £{intel.hourlyRate}/h — meets your rate</span>
    ) : (
      <span className="chip bg-red-500/15 text-red-200">✗ £{intel.hourlyRate}/h — below your £{settings.minHourlyRate}/h</span>
    );

  const driveTime = formatDriveTime(intel.drivingHours);
  const driveLabel = intel.returnLegIncluded ? `${driveTime} round trip` : `${driveTime} drive`;

  if (compact) {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
        <span className={`chip ${VERDICT_STYLES[intel.verdict]}`}>{intel.verdictLabel}</span>
        <span className="chip bg-white/10 text-slate-200">🕐 {driveLabel}</span>
        <span className="text-slate-500">
          Est. {formatGbp(intel.suggestedBid)} · fuel {formatGbp(intel.fuelCost)} · profit ~{formatGbp(intel.profitAtBid)} · £{intel.hourlyRate}/h
        </span>
        {rateBadge}
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
        <div className="flex flex-col items-end gap-1">
          <span className="inline-flex items-center gap-1 rounded-lg bg-black/25 px-2 py-1 text-sm font-bold">
            🕐 {driveTime}
            <span className="text-[10px] font-normal opacity-70">{intel.returnLegIncluded ? "round trip" : "drive"}</span>
          </span>
          <span className="text-xs opacity-80">{intel.competitionLabel}</span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <IntelStat label="Est. winning bid" value={formatGbp(intel.suggestedBid)} sub={`${formatGbp(intel.bidLow)}–${formatGbp(intel.bidHigh)} range`} />
        <IntelStat
          label="Drive time"
          value={driveTime}
          sub={`${intel.miles} mi${intel.returnLegIncluded ? " · incl. return" : " each way"}`}
        />
        <IntelStat
          label="Est. profit"
          value={formatGbp(intel.profitAtBid)}
          sub={`${formatGbp(intel.profitPerMile)}/mi · ${intel.marginPct}% margin`}
        />
        <IntelStat label="Est. £/hour" value={`£${intel.hourlyRate}`} sub={`${formatGbp(intel.fuelCost)} fuel · ${intel.fuelLitres}L`} />
      </div>

      {rateBadge && <div className="mt-2">{rateBadge}</div>}

      <p className="mt-2 text-[10px] opacity-60">
        Based on your van ({settings.mpg} mpg, £{settings.fuelPpl.toFixed(2)}/L){intel.returnLegIncluded ? ", return leg included" : ""} and
        category pricing — estimates, not live Shiply quotes.
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
