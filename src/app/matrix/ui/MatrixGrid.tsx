"use client";

import { useMemo, useState } from "react";
import { JobSheet, type SheetTarget } from "./JobSheet";

type Service = { service: string; serviceType: string };
type Pickup = { pickupKey: string; count: number };
type Cell = {
  service: string;
  pickupKey: string;
  jobCount: number;
  minMiles: number | null;
  maxMiles: number | null;
  jobKeys: string; // JSON string[]
};

export function MatrixGrid({
  services,
  pickups,
  cells,
}: {
  services: Service[];
  pickups: Pickup[];
  cells: Cell[];
}) {
  const [target, setTarget] = useState<SheetTarget>(null);
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>("all");

  const cellMap = useMemo(() => {
    const m = new Map<string, Cell>();
    for (const c of cells) m.set(`${c.service}|||${c.pickupKey}`, c);
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

      <div className="relative overflow-auto rounded-2xl border border-white/10" style={{ maxHeight: "72vh" }}>
        <table className="border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th
                className="sticky left-0 top-0 z-30 border-b border-r border-white/10 bg-ink-950 px-4 py-3 text-left font-semibold text-white"
                style={{ minWidth: 180 }}
              >
                Service
              </th>
              {pickups.map((p) => (
                <th
                  key={p.pickupKey}
                  className="sticky top-0 z-20 border-b border-r border-white/10 bg-ink-950 px-3 py-3 text-left font-medium text-slate-200"
                  style={{ minWidth: 150 }}
                >
                  <div className="whitespace-nowrap">{p.pickupKey}</div>
                  <div className="text-[11px] font-normal text-slate-500">{p.count} jobs</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleServices.map((s) => (
              <tr key={s.service}>
                <th
                  className="sticky left-0 z-10 border-b border-r border-white/10 bg-ink-900 px-4 py-3 text-left font-medium text-white"
                  style={{ minWidth: 180 }}
                >
                  <div className="whitespace-nowrap">{s.service}</div>
                  <div className="text-[11px] font-normal text-slate-500">{s.serviceType}</div>
                </th>
                {pickups.map((p) => {
                  const cell = cellMap.get(`${s.service}|||${p.pickupKey}`);
                  if (!cell || cell.jobCount === 0) {
                    return (
                      <td
                        key={p.pickupKey}
                        className="border-b border-r border-white/5 bg-ink-950/40 px-3 py-3 text-center text-slate-700"
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
                  return (
                    <td key={p.pickupKey} className="border-b border-r border-white/5 px-2 py-2">
                      <button
                        onClick={() =>
                          setTarget({
                            service: s.service,
                            pickupKey: p.pickupKey,
                            jobKeys: safeParse(cell.jobKeys),
                          })
                        }
                        className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left transition hover:border-brand-400/40 hover:bg-brand-500/10"
                      >
                        <div className="text-sm font-semibold text-white">{cell.jobCount} jobs</div>
                        {range && <div className="text-[11px] text-slate-400">{range}</div>}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-500">
        Service is frozen on the left, pickup locations are frozen on top. Swipe/scroll horizontally to browse, then tap a
        cell to see jobs (nearest drop-off first) with Shiply links.
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
