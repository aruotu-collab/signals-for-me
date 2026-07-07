"use client";

import { useMemo, useState } from "react";
import { JobSheet, type SheetTarget } from "./JobSheet";
import { analyzeJob, formatGbp, jobPassesWorthItFilter } from "@/lib/shiply/intelligence";
import { useDriverSettings } from "@/lib/shiply/driverSettings";
import type { DriverSettings } from "@/lib/shiply/driverSettingsCore";

type Service = { service: string; serviceType: string };
type Hub = { pickupHub: string; count: number };
type Cell = {
  service: string;
  pickupHub: string;
  jobCount: number;
  areaCount: number;
  minMiles: number | null;
  maxMiles: number | null;
  jobKeys: string;
};

export function MatrixGrid({
  services,
  hubs,
  cells,
}: {
  services: Service[];
  hubs: Hub[];
  cells: Cell[];
}) {
  const [target, setTarget] = useState<SheetTarget>(null);
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>("all");
  const { settings } = useDriverSettings();

  const cellMap = useMemo(() => {
    const m = new Map<string, Cell>();
    for (const c of cells) m.set(`${c.service}|||${c.pickupHub}`, c);
    return m;
  }, [cells]);

  const serviceTypes = useMemo(() => {
    const set = new Set(services.map((s) => s.serviceType));
    return ["all", ...Array.from(set).sort()];
  }, [services]);

  const visibleServices = useMemo(
    () => (serviceTypeFilter === "all" ? services : services.filter((s) => s.serviceType === serviceTypeFilter)),
    [services, serviceTypeFilter],
  );

  if (services.length === 0) {
    return (
      <div className="card p-8 text-center text-sm text-slate-400">
        No Shiply jobs imported yet. Go to{" "}
        <a href="/admin/shiply" className="text-brand-300 underline">
          Admin → Shiply
        </a>{" "}
        to upload your spreadsheet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {serviceTypes.map((t) => (
          <button
            key={t}
            onClick={() => setServiceTypeFilter(t)}
            className={`chip ${
              serviceTypeFilter === t ? "bg-brand-500/20 text-brand-200" : "bg-white/5 text-slate-400 hover:text-white"
            }`}
          >
            {t === "all" ? "All service types" : t}
          </button>
        ))}
      </div>

      <div className="-mx-4 sm:mx-0">
        <div
          className="relative overflow-auto rounded-none border-y border-white/10 sm:rounded-2xl sm:border"
          style={{ maxHeight: "72vh" }}
        >
          <table className="border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 top-0 z-30 w-[5.5rem] min-w-[5.5rem] max-w-[5.5rem] border-b border-r border-white/10 bg-ink-950 px-2 py-2 text-left align-bottom text-xs font-semibold text-white sm:w-36 sm:min-w-36 sm:max-w-36 sm:px-3 sm:py-3 sm:text-sm">
                  <div>Service ↓</div>
                  <div className="mt-0.5 text-[10px] font-normal text-brand-300 sm:text-[11px]">Pickup from →</div>
                </th>
                {hubs.map((h) => (
                  <th
                    key={h.pickupHub}
                    className="sticky top-0 z-20 min-w-[6.5rem] border-b border-r border-white/10 bg-ink-950 px-2 py-2 text-left align-bottom text-xs font-medium text-slate-200 sm:min-w-[9.5rem] sm:px-3 sm:py-3 sm:text-sm"
                  >
                    <div className="text-[9px] font-semibold uppercase tracking-wide text-brand-300/80 sm:text-[10px]">
                      📍 Pickup from
                    </div>
                    <div className="break-words leading-tight">{h.pickupHub}</div>
                    <div className="text-[10px] font-normal text-slate-500 sm:text-[11px]">{h.count} jobs</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleServices.map((s) => (
                <tr key={s.service}>
                  <th className="sticky left-0 z-10 w-[5.5rem] min-w-[5.5rem] max-w-[5.5rem] border-b border-r border-white/10 bg-ink-900 px-2 py-2 text-left align-top sm:w-36 sm:min-w-36 sm:max-w-36 sm:px-3 sm:py-3">
                    <div className="break-words text-xs font-medium leading-snug text-white sm:text-sm">{s.service}</div>
                    <div className="mt-0.5 break-words text-[10px] font-normal leading-tight text-slate-500 sm:text-[11px]">
                      {s.serviceType}
                    </div>
                  </th>
                  {hubs.map((h) => {
                    const cell = cellMap.get(`${s.service}|||${h.pickupHub}`);
                    if (!cell || cell.jobCount === 0) {
                      return (
                        <td
                          key={h.pickupHub}
                          className="min-w-[6.5rem] border-b border-r border-white/5 bg-ink-950/40 px-2 py-2 text-center text-slate-700 sm:min-w-[9.5rem] sm:px-3 sm:py-3"
                        >
                          ·
                        </td>
                      );
                    }
                    const range =
                      cell.minMiles != null && cell.maxMiles != null
                        ? cell.minMiles === cell.maxMiles
                          ? `${cell.minMiles} mi`
                          : `${cell.minMiles}–${cell.maxMiles} mi`
                        : "";
                    const worthIt =
                      cell.minMiles != null
                        ? jobPassesWorthItFilter(
                            { miles: cell.minMiles, quotes: 4, service: s.service },
                            settings,
                          )
                        : true;
                    const dimmed = settings.onlyWorthIt && !worthIt;
                    return (
                      <td
                        key={h.pickupHub}
                        className="min-w-[6.5rem] border-b border-r border-white/5 px-1.5 py-1.5 sm:min-w-[9.5rem] sm:px-2 sm:py-2"
                      >
                        <button
                          onClick={() =>
                            setTarget({
                              service: s.service,
                              pickupHub: h.pickupHub,
                              jobKeys: safeParse(cell.jobKeys),
                            })
                          }
                          className={`w-full rounded-lg border px-2 py-1.5 text-left transition sm:px-3 sm:py-2 ${
                            dimmed
                              ? "border-white/5 bg-white/[0.01] opacity-50 hover:opacity-70"
                              : "border-white/10 bg-white/[0.03] hover:border-brand-400/40 hover:bg-brand-500/10"
                          }`}
                        >
                          <div className="text-xs font-semibold text-white sm:text-sm">{cell.jobCount} jobs</div>
                          {cell.areaCount > 1 && (
                            <div className="text-[10px] text-brand-300/80 sm:text-[11px]">{cell.areaCount} areas</div>
                          )}
                          {range && <div className="text-[10px] text-slate-400 sm:text-[11px]">{range}</div>}
                          {cell.minMiles != null && (
                            <CellProfitHint miles={cell.minMiles} service={s.service} settings={settings} />
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        <span className="text-brand-300">Columns = pickup from</span> · Rows = service type. Tap a cell for route
        intelligence — est. fuel, winning bid, and profit per job.
      </p>

      <JobSheet target={target} onClose={() => setTarget(null)} />
    </div>
  );
}

function safeParse(s: string): string[] {
  try {
    const arr = JSON.parse(s);
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch {
    return [];
  }
}

function CellProfitHint({
  miles,
  service,
  settings,
}: {
  miles: number;
  service: string;
  settings: DriverSettings;
}) {
  const passes = jobPassesWorthItFilter({ miles, quotes: 4, service }, settings);
  if (settings.onlyWorthIt && !passes) {
    return (
      <div className="text-[10px] font-medium text-slate-600 sm:text-[11px]">
        Below £{settings.minHourlyRate}/h
      </div>
    );
  }
  const intel = analyzeJob({ miles, quotes: 4, service }, settings);
  if (!intel || intel.verdict === "thin") return null;
  const color =
    intel.verdict === "strong"
      ? "text-emerald-400"
      : intel.verdict === "good"
        ? "text-sky-400"
        : "text-amber-400";
  return (
    <div className={`text-[10px] font-medium sm:text-[11px] ${color}`}>
      ~{formatGbp(intel.profitAtBid)} est. profit · £{intel.hourlyRate}/h profit
    </div>
  );
}
