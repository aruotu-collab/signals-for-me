import Link from "next/link";
import { formatGBP, formatGBPSigned, HORIZON_LABELS } from "@/lib/opportunity";
import type { BriefRow } from "@/lib/brief";

// Head-to-head comparison: each opportunity becomes a column, each decision
// dimension a row. The column with the best expected value is flagged as the
// recommended pick — this is the heart of an "opportunity comparison" site.
export function ComparisonGrid({ rows }: { rows: BriefRow[] }) {
  if (rows.length === 0) {
    return <p className="card p-6 text-sm text-slate-400">Nothing to compare yet.</p>;
  }

  const bestEv = Math.max(...rows.map((r) => r.opportunity.expectedValue));
  const gridCols = `minmax(140px,160px) repeat(${rows.length}, minmax(180px,1fr))`;

  return (
    <div className="card overflow-x-auto p-0">
      <div className="grid" style={{ gridTemplateColumns: gridCols }}>
        {/* Header row: each opportunity */}
        <Cell head sticky />
        {rows.map((r) => {
          const best = r.opportunity.expectedValue === bestEv && rows.length > 1;
          return (
            <Cell key={r.signal.id} head highlight={best}>
              {best && (
                <span className="mb-1 inline-block rounded-md bg-signal-growth/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-signal-growth">
                  Best expected value
                </span>
              )}
              <div className="font-semibold text-white">{r.opportunity.label}</div>
              <Link
                href={`/signals/${r.signal.id}`}
                className="mt-0.5 block text-xs text-slate-400 hover:text-slate-200 hover:underline"
                title={r.signal.title}
              >
                {r.signal.title}
              </Link>
            </Cell>
          );
        })}

        <Row label="Expected value" rows={rows} highlightBest bestEv={bestEv}
          render={(r) => (
            <span className={`text-lg font-bold ${r.opportunity.expectedValue >= 0 ? "text-signal-growth" : "text-signal-distress"}`}>
              {formatGBPSigned(r.opportunity.expectedValue)}
            </span>
          )}
        />
        <Row label="Revenue potential" rows={rows}
          render={(r) =>
            r.opportunity.valueHigh > 0
              ? `${formatGBP(r.opportunity.valueLow)}–${formatGBP(r.opportunity.valueHigh)}`
              : "—"
          }
        />
        <Row label="Revenue at risk" rows={rows}
          render={(r) =>
            r.opportunity.riskHigh > 0 ? (
              <span className="text-signal-distress">
                {formatGBP(r.opportunity.riskLow)}–{formatGBP(r.opportunity.riskHigh)}
              </span>
            ) : (
              <span className="text-slate-500">Low</span>
            )
          }
        />
        <Row label="ROI" rows={rows}
          render={(r) =>
            r.opportunity.roi > 0 ? (
              <span title={`Est. cost ${formatGBP(r.opportunity.actionCost)}`}>
                <span className="font-semibold text-white">{r.opportunity.roi}x</span>
                <span className="ml-1 text-xs text-slate-500">on ~{formatGBP(r.opportunity.actionCost)}</span>
              </span>
            ) : (
              "—"
            )
          }
        />
        <Row label="Confidence" rows={rows} render={(r) => `${Math.round(r.signal.confidence * 100)}%`} />
        <Row label="Opportunity score" rows={rows} render={(r) => `${r.opportunity.score} / 100`} />
        <Row label="Act by" rows={rows} render={(r) => HORIZON_LABELS[r.opportunity.horizon]} />
        <Row label="Urgency" rows={rows} render={(r) => <Pill text={r.opportunity.urgency} hot={r.opportunity.urgency === "high"} />} />
        <Row label="Effort" rows={rows} render={(r) => <Pill text={r.opportunity.effort} good={r.opportunity.effort === "low"} />} />
        <Row label="Type" rows={rows} render={(r) => r.trend} />
        <Row label="Area" rows={rows} render={(r) => r.opportunity.area ?? "—"} />
        <Row label="Recommended action" rows={rows} render={(r) => <span className="text-slate-200">{r.opportunity.action}</span>} />
        <Row label="Action plan" rows={rows}
          render={(r) => (
            <ol className="list-decimal space-y-1 pl-4 text-xs text-slate-300">
              {r.opportunity.actionPlan.map((step, i) => (
                <li key={i} className="break-words">{step}</li>
              ))}
            </ol>
          )}
        />
        <Row label="Source" rows={rows}
          render={(r) =>
            r.signal.sourceUrl ? (
              <a href={r.signal.sourceUrl} target="_blank" rel="noreferrer" className="text-brand-300 hover:underline">
                {r.signal.rawSource} ↗
              </a>
            ) : (
              r.signal.rawSource
            )
          }
        />
        <Row label="How we estimated" rows={rows} last
          render={(r) => (
            <ul className="list-disc space-y-1 pl-4 text-xs text-slate-400">
              {r.opportunity.assumptions.map((a, i) => (
                <li key={i} className="break-words">{a}</li>
              ))}
            </ul>
          )}
        />
      </div>
    </div>
  );
}

function Row({
  label,
  rows,
  render,
  highlightBest,
  bestEv,
  last,
}: {
  label: string;
  rows: BriefRow[];
  render: (r: BriefRow) => React.ReactNode;
  highlightBest?: boolean;
  bestEv?: number;
  last?: boolean;
}) {
  return (
    <>
      <Cell label sticky last={last}>
        {label}
      </Cell>
      {rows.map((r) => {
        const best = highlightBest && rows.length > 1 && r.opportunity.expectedValue === bestEv;
        return (
          <Cell key={r.signal.id} highlight={best} last={last}>
            {render(r)}
          </Cell>
        );
      })}
    </>
  );
}

function Cell({
  children,
  head,
  label,
  highlight,
  sticky,
  last,
}: {
  children?: React.ReactNode;
  head?: boolean;
  label?: boolean;
  highlight?: boolean;
  sticky?: boolean;
  last?: boolean;
}) {
  const base = "px-4 py-3 text-sm break-words";
  const border = last ? "" : "border-b border-white/5";
  const headCls = head ? "bg-white/[0.03] align-bottom" : "";
  const labelCls = label ? "text-xs font-semibold uppercase tracking-wide text-slate-400" : "text-slate-300";
  const stickyCls = sticky ? "sticky left-0 z-10 bg-ink-900/95" : "";
  const hi = highlight ? "bg-signal-growth/[0.06]" : "";
  return <div className={`${base} ${border} ${headCls} ${labelCls} ${stickyCls} ${hi}`}>{children}</div>;
}

function Pill({ text, hot, good }: { text: string; hot?: boolean; good?: boolean }) {
  const tone = good
    ? "bg-signal-growth/15 text-signal-growth"
    : hot
      ? "bg-signal-buying/15 text-signal-buying"
      : "bg-white/5 text-slate-300";
  return <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-medium capitalize ${tone}`}>{text}</span>;
}
