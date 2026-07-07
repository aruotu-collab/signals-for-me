"use client";

import type { JobStatus } from "@/lib/favourites";
import { formatGbp } from "@/lib/shiply/intelligence";

export function ProfitBanner({
  status,
  total,
  withProfit,
  count,
}: {
  status: JobStatus;
  total: number;
  withProfit: number;
  count: number;
}) {
  if (count === 0) return null;

  const headline =
    status === "saved"
      ? "If you won everything you've saved"
      : status === "won"
        ? "Total profit on jobs to supply"
        : "Total profit earned";

  const sub =
    withProfit < count
      ? `${withProfit} of ${count} jobs with profit estimates — add miles or your bid for the rest`
      : `${count} job${count === 1 ? "" : "s"}`;

  return (
    <div className="card border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-brand-500/5 p-5">
      <div className="text-xs font-medium uppercase tracking-wide text-emerald-300/80">{headline}</div>
      <div className="mt-1 text-3xl font-bold text-white">
        {withProfit > 0 ? (
          <>
            ~{formatGbp(total)}{" "}
            <span className="text-base font-normal text-slate-400">
              {status === "completed" ? "actual" : "est."} profit
            </span>
          </>
        ) : (
          <span className="text-lg text-slate-400">Add miles or bids to see totals</span>
        )}
      </div>
      <p className="mt-2 text-xs text-slate-400">{sub} · Based on your van settings</p>
    </div>
  );
}
