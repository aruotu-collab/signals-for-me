"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatGBP, formatGBPSigned } from "@/lib/opportunity";
import type { ScoredItem } from "@/lib/scoreboard";

// The "scoreboard of money": every opportunity ranked side by side on Expected
// value (£), Value (£), Risk (£), Confidence, Urgency, Effort and the action.
// This is the comparison engine — sortable by any column, and you can tick rows
// to put them head-to-head on the /compare page.

type SortKey = "expected" | "roi" | "value" | "risk" | "confidence" | "urgency" | "effort";
const URGENCY_RANK: Record<string, number> = { high: 3, medium: 2, low: 1 };
const EFFORT_RANK: Record<string, number> = { low: 3, medium: 2, high: 1 }; // low effort ranks "best"
const MAX_COMPARE = 4;

export function OpportunityTable({
  items,
  compareBase = {},
}: {
  items: ScoredItem[];
  /** business/location/goal carried into the /compare link */
  compareBase?: Record<string, string>;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("expected");
  const [asc, setAsc] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const sorted = useMemo(() => {
    const arr = items.slice();
    arr.sort((a, b) => {
      const A = a.opportunity;
      const B = b.opportunity;
      let d = 0;
      switch (sortKey) {
        case "roi":
          d = B.roi - A.roi;
          break;
        case "value":
          d = B.valueHigh - A.valueHigh;
          break;
        case "risk":
          d = B.riskHigh - A.riskHigh;
          break;
        case "confidence":
          d = b.signal.confidence - a.signal.confidence;
          break;
        case "urgency":
          d = URGENCY_RANK[B.urgency] - URGENCY_RANK[A.urgency];
          break;
        case "effort":
          d = EFFORT_RANK[B.effort] - EFFORT_RANK[A.effort];
          break;
        default:
          d = B.expectedValue - A.expectedValue;
      }
      return asc ? -d : d;
    });
    return arr;
  }, [items, sortKey, asc]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) setAsc((v) => !v);
    else {
      setSortKey(key);
      setAsc(false);
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_COMPARE) next.add(id);
      return next;
    });
  }

  const compareHref = useMemo(() => {
    const params = new URLSearchParams(compareBase);
    params.set("ids", Array.from(selected).join(","));
    return `/compare?${params.toString()}`;
  }, [selected, compareBase]);

  if (items.length === 0) {
    return <p className="card p-5 text-sm text-slate-400">No opportunities match these filters.</p>;
  }

  return (
    <div>
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-3 py-3 font-semibold" />
                <th className="px-3 py-3 font-semibold">#</th>
                <th className="px-4 py-3 font-semibold">Opportunity</th>
                <SortTh label="Exp. value" active={sortKey === "expected"} asc={asc} onClick={() => toggleSort("expected")} align="right" />
                <SortTh label="ROI" active={sortKey === "roi"} asc={asc} onClick={() => toggleSort("roi")} align="center" />
                <SortTh label="Value" active={sortKey === "value"} asc={asc} onClick={() => toggleSort("value")} align="right" />
                <SortTh label="Risk" active={sortKey === "risk"} asc={asc} onClick={() => toggleSort("risk")} align="right" />
                <SortTh label="Conf." active={sortKey === "confidence"} asc={asc} onClick={() => toggleSort("confidence")} align="center" />
                <SortTh label="Urgency" active={sortKey === "urgency"} asc={asc} onClick={() => toggleSort("urgency")} align="center" />
                <SortTh label="Effort" active={sortKey === "effort"} asc={asc} onClick={() => toggleSort("effort")} align="center" />
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((it, i) => {
                const { signal, opportunity: o } = it;
                const checked = selected.has(signal.id);
                return (
                  <tr
                    key={signal.id}
                    className={`border-b border-white/5 align-top last:border-0 hover:bg-white/[0.02] ${checked ? "bg-brand-500/[0.06]" : ""}`}
                  >
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSelect(signal.id)}
                        aria-label={`Select ${o.label} to compare`}
                        className="h-4 w-4 accent-brand-500"
                      />
                    </td>
                    <td className="px-3 py-3 text-slate-500">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{o.label}</span>
                        <ScoreBadge score={o.score} />
                      </div>
                      <Link
                        href={`/signals/${signal.id}`}
                        className="block max-w-[240px] truncate text-xs text-slate-400 hover:text-slate-200 hover:underline"
                        title={signal.title}
                      >
                        {signal.title}
                      </Link>
                      {o.area && <div className="text-[11px] text-slate-500">{o.area}</div>}
                    </td>
                    <td className={`px-3 py-3 text-right font-bold ${o.expectedValue >= 0 ? "text-signal-growth" : "text-signal-distress"}`}>
                      {formatGBPSigned(o.expectedValue)}
                    </td>
                    <td className="px-3 py-3 text-center font-semibold text-slate-200" title={`Est. cost ${formatGBP(o.actionCost)}`}>
                      {o.roi > 0 ? `${o.roi}x` : "—"}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-signal-growth">
                      {o.valueHigh > 0 ? `${formatGBP(o.valueLow)}–${formatGBP(o.valueHigh)}` : "—"}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-signal-distress">
                      {o.riskHigh > 0 ? `${formatGBP(o.riskLow)}–${formatGBP(o.riskHigh)}` : <span className="text-slate-500">Low</span>}
                    </td>
                    <td className="px-3 py-3 text-center text-slate-300">{Math.round(signal.confidence * 100)}%</td>
                    <td className="px-3 py-3 text-center"><Badge level={o.urgency} kind="urgency" /></td>
                    <td className="px-3 py-3 text-center"><Badge level={o.effort} kind="effort" /></td>
                    <td className="px-4 py-3">
                      <span className="block max-w-[280px] text-xs text-slate-300">{o.action}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <CompareBar
        count={selected.size}
        href={compareHref}
        onClear={() => setSelected(new Set())}
      />
    </div>
  );
}

function SortTh({
  label,
  active,
  asc,
  onClick,
  align,
}: {
  label: string;
  active: boolean;
  asc: boolean;
  onClick: () => void;
  align: "left" | "center" | "right";
}) {
  const justify = align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start";
  const thAlign = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <th className={`px-3 py-3 font-semibold ${thAlign}`}>
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex w-full items-center gap-1 ${justify} hover:text-white ${active ? "text-white" : ""}`}
      >
        {label}
        <span className="text-[9px]">{active ? (asc ? "▲" : "▼") : "↕"}</span>
      </button>
    </th>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const tone =
    score >= 70 ? "bg-signal-growth/15 text-signal-growth" : score >= 45 ? "bg-signal-buying/15 text-signal-buying" : "bg-white/5 text-slate-400";
  return (
    <span className={`inline-block shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${tone}`} title="Opportunity score / 100">
      {score}
    </span>
  );
}

function Badge({ level, kind }: { level: string; kind: "urgency" | "effort" }) {
  // For urgency, high = hot (amber). For effort, low = good (green).
  const good = kind === "effort" ? level === "low" : false;
  const hot = level === "high";
  const tone = good
    ? "bg-signal-growth/15 text-signal-growth"
    : hot
      ? "bg-signal-buying/15 text-signal-buying"
      : "bg-white/5 text-slate-300";
  return (
    <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-medium capitalize ${tone}`}>
      {level}
    </span>
  );
}

function CompareBar({ count, href, onClear }: { count: number; href: string; onClear: () => void }) {
  if (count === 0) return null;
  const ready = count >= 2;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-white/10 bg-ink-900/95 px-4 py-3 shadow-glow backdrop-blur">
        <span className="text-sm text-slate-300">
          <span className="font-bold text-white">{count}</span> selected
          {!ready && <span className="ml-1 text-xs text-slate-500">(pick at least 2)</span>}
        </span>
        <button type="button" onClick={onClear} className="text-xs text-slate-400 hover:text-white">
          Clear
        </button>
        {ready ? (
          <Link href={href} className="btn-primary px-4 py-2 text-sm">
            Compare {count} →
          </Link>
        ) : (
          <span className="btn-primary cursor-not-allowed px-4 py-2 text-sm opacity-40">Compare →</span>
        )}
      </div>
    </div>
  );
}
