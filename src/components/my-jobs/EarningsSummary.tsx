"use client";

import { useMemo } from "react";
import { useFavourites } from "@/components/FavouritesProvider";
import { earningsSummary, type EarningsWindow, type ShiplyJobLookup } from "@/lib/jobProfit";
import { formatGbp } from "@/lib/shiply/intelligence";
import { useDriverSettings } from "@/lib/shiply/driverSettings";

export function EarningsSummary({ shiplyLookup }: { shiplyLookup?: Map<string, ShiplyJobLookup> }) {
  const { favourites } = useFavourites();
  const { settings } = useDriverSettings();

  const summary = useMemo(
    () => earningsSummary(favourites, settings, shiplyLookup),
    [favourites, settings, shiplyLookup],
  );

  const hasHistory = summary.allTime.jobs > 0;
  const hasUpcoming = summary.upcoming.jobs > 0;

  if (!hasHistory && !hasUpcoming) return null;

  return (
    <div className="card border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-brand-500/5 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-300/80">Your earnings</h2>
        {hasUpcoming && (
          <span className="chip bg-brand-500/15 text-brand-200">
            {formatGbp(summary.upcoming.profit)} to supply · {summary.upcoming.jobs} job{summary.upcoming.jobs === 1 ? "" : "s"}
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Stat label="This week" win={summary.week} highlight />
        <Stat label="This month" win={summary.month} />
        <Stat label="All time" win={summary.allTime} />
      </div>

      <p className="mt-3 text-xs text-slate-400">
        Profit from completed jobs (actual where you entered a bid, otherwise estimated from your van settings).
      </p>
    </div>
  );
}

function Stat({ label, win, highlight }: { label: string; win: EarningsWindow; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-3 text-center ${highlight ? "bg-emerald-500/10" : "bg-white/[0.03]"}`}>
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-xl font-bold ${highlight ? "text-emerald-200" : "text-white"}`}>
        {formatGbp(win.profit)}
      </div>
      <div className="mt-0.5 text-[11px] text-slate-500">
        {win.jobs} job{win.jobs === 1 ? "" : "s"}
        {win.miles > 0 && ` · ${win.miles.toLocaleString()} mi`}
      </div>
    </div>
  );
}
