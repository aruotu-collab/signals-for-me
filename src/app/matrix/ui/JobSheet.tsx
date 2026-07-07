"use client";

import { useEffect, useMemo, useState } from "react";
import { ShiplyJobCard, type ShiplyJobCardData } from "@/components/shiply/ShiplyJobCard";
import { useDriverSettings } from "@/lib/shiply/driverSettings";
import { analyzeJob, jobPassesWorthItFilter } from "@/lib/shiply/intelligence";

export type SheetJob = ShiplyJobCardData & { pickupHub: string };

export type SheetTarget = {
  service: string;
  pickupHub: string;
  jobKeys: string[];
} | null;

export function JobSheet({ target, onClose }: { target: SheetTarget; onClose: () => void }) {
  const [jobs, setJobs] = useState<SheetJob[]>([]);
  const [loading, setLoading] = useState(false);
  const { settings } = useDriverSettings();

  useEffect(() => {
    if (!target) return;
    let cancelled = false;
    setLoading(true);
    setJobs([]);
    fetch("/api/shiply/jobs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ keys: target.jobKeys }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setJobs(d.jobs ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [target]);

  const visibleJobs = useMemo(
    () => jobs.filter((j) => jobPassesWorthItFilter(j, settings)),
    [jobs, settings],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, SheetJob[]>();
    for (const j of visibleJobs) {
      const list = map.get(j.pickupKey) ?? [];
      list.push(j);
      map.set(j.pickupKey, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [visibleJobs]);

  const summary = useMemo(() => {
    let strong = 0;
    let totalProfit = 0;
    let withIntel = 0;
    for (const j of visibleJobs) {
      const intel = analyzeJob(j, settings);
      if (!intel) continue;
      withIntel++;
      totalProfit += intel.profitAtBid;
      if (intel.verdict === "strong" || intel.verdict === "good") strong++;
    }
    return { strong, totalProfit, withIntel };
  }, [visibleJobs, settings]);

  const hiddenCount = jobs.length - visibleJobs.length;

  if (!target) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <button aria-label="Close" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-t-2xl border border-white/10 bg-ink-900 sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-brand-300">📍 Pickup from {target.pickupHub}</div>
            <h2 className="text-lg font-bold text-white">{target.service}</h2>
            <p className="text-xs text-slate-400">
              {visibleJobs.length} jobs shown
              {hiddenCount > 0 && ` (${hiddenCount} hidden below £${settings.minHourlyRate}/h)`}
              {grouped.length > 0 && ` · ${grouped.length} areas`} · nearest drop-off first
            </p>
            {!loading && summary.withIntel > 0 && (
              <p className="mt-2 text-xs text-sky-300">
                Route intelligence: {summary.strong} of {summary.withIntel} look profitable after est. fuel
                {summary.totalProfit > 0 && ` · ~£${summary.totalProfit.toLocaleString("en-GB")} combined est. profit if won`}
              </p>
            )}
          </div>
          <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:bg-white/5 hover:text-white">
            Close
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-4">
          {loading && <p className="text-sm text-slate-500">Loading jobs…</p>}
          {!loading && visibleJobs.length === 0 && (
            <p className="text-sm text-slate-400">
              {jobs.length === 0
                ? "No jobs found."
                : `No jobs meet your £${settings.minHourlyRate}/hour minimum. Turn off the filter in Your van & rates or lower your target rate.`}
            </p>
          )}

          <div className="space-y-6">
            {grouped.map(([area, areaJobs]) => (
              <section key={area}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {area} · {areaJobs.length} {areaJobs.length === 1 ? "job" : "jobs"}
                </h3>
                <ul className="space-y-3">
                  {areaJobs.map((j) => (
                    <li key={j.shiplyKey}>
                      <ShiplyJobCard job={j} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
