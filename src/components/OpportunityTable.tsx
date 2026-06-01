import Link from "next/link";
import { formatGBP } from "@/lib/opportunity";
import type { ScoredItem } from "@/lib/scoreboard";

// The "scoreboard of money": every opportunity ranked side by side on Value (£),
// Risk (£), Confidence, Urgency, Effort and the recommended Action. This is the
// comparison view the product is really about.
export function OpportunityTable({ items }: { items: ScoredItem[] }) {
  if (items.length === 0) {
    return <p className="card p-5 text-sm text-slate-400">No opportunities match these filters.</p>;
  }
  return (
    <div className="card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3 font-semibold">#</th>
              <th className="px-4 py-3 font-semibold">Opportunity</th>
              <th className="px-3 py-3 text-right font-semibold">Value</th>
              <th className="px-3 py-3 text-right font-semibold">Risk</th>
              <th className="px-3 py-3 text-center font-semibold">Conf.</th>
              <th className="px-3 py-3 text-center font-semibold">Urgency</th>
              <th className="px-3 py-3 text-center font-semibold">Effort</th>
              <th className="px-4 py-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => {
              const { signal, opportunity: o } = it;
              return (
                <tr key={signal.id} className="border-b border-white/5 align-top last:border-0 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{o.label}</div>
                    <Link
                      href={`/signals/${signal.id}`}
                      className="block max-w-[240px] truncate text-xs text-slate-400 hover:text-slate-200 hover:underline"
                      title={signal.title}
                    >
                      {signal.title}
                    </Link>
                    {o.area && <div className="text-[11px] text-slate-500">{o.area}</div>}
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
  );
}

function Badge({ level, kind }: { level: string; kind: "urgency" | "effort" }) {
  // For urgency, high = hot (amber/red). For effort, low = good (green).
  const good = kind === "effort" ? level === "low" : false;
  const hot = kind === "urgency" ? level === "high" : level === "high";
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
