import Link from "next/link";
import type { BriefRow } from "@/lib/brief";
import { formatGBPSigned } from "@/lib/opportunity";

// A single opportunity, rendered as a rich card (used in the "cards" view of a
// lens page). The table view is handled separately by OpportunityTable.
export function OpportunityCard({ row }: { row: BriefRow }) {
  const { signal, opportunity: opp } = row;
  return (
    <article className="card p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-white">{opp.label}</h3>
            {opp.defensive && <span className="chip bg-signal-distress/15 text-signal-distress">defensive</span>}
            <span className="chip bg-white/5 text-slate-300">{row.trend}</span>
            {row.locationMatch && (
              <span className="chip bg-signal-government/15 text-signal-government">local match</span>
            )}
            {row.industryMatch && (
              <span className="chip bg-signal-hiring/15 text-signal-hiring">industry match</span>
            )}
          </div>
          <Link
            href={`/signals/${signal.id}`}
            className="mt-1 block text-sm text-slate-400 hover:text-slate-200 hover:underline"
          >
            From signal: {signal.title}
          </Link>
        </div>
        <ScoreDial score={opp.score} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Expected value" tone={opp.expectedValue >= 0 ? "growth" : "risk"}>
          {formatGBPSigned(opp.expectedValue)}
        </Stat>
        <Stat label={opp.basis === "at risk" ? "Revenue at risk" : "Revenue potential"}>{opp.revenueLabel}</Stat>
        <Stat label="Area">{opp.area ?? "—"}</Stat>
        <Stat label="Confidence">{Math.round(signal.confidence * 100)}%</Stat>
      </div>

      <div className="mt-4 rounded-xl border border-signal-hiring/30 bg-signal-hiring/[0.06] p-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-signal-hiring">Recommended action</div>
        <p className="mt-1 break-words text-sm text-slate-200">{opp.action}</p>
      </div>

      {row.risk && (
        <p className="mt-3 text-sm text-slate-400">
          <span className="font-medium text-slate-300">Watch:</span> {row.risk.title}{" "}
          <span className="text-xs text-slate-500">({row.risk.rating} risk)</span>
        </p>
      )}

      <details className="mt-3 text-sm text-slate-400">
        <summary className="cursor-pointer select-none text-xs text-slate-500 hover:text-slate-300">
          How we estimated this
        </summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-400">
          {opp.assumptions.map((a, i) => (
            <li key={i} className="break-words">
              {a}
            </li>
          ))}
        </ul>
      </details>
    </article>
  );
}

function ScoreDial({ score }: { score: number }) {
  const tone = score >= 70 ? "text-signal-growth" : score >= 45 ? "text-signal-buying" : "text-slate-400";
  return (
    <div className="shrink-0 text-right">
      <div className={`text-2xl font-bold ${tone}`}>{score}</div>
      <div className="text-[11px] uppercase tracking-wide text-slate-500">opp. score</div>
    </div>
  );
}

function Stat({
  label,
  children,
  accent,
  tone,
}: {
  label: string;
  children: React.ReactNode;
  accent?: boolean;
  tone?: "growth" | "risk";
}) {
  const toneCls = tone === "risk" ? "text-lg font-bold text-signal-distress" : "text-lg font-bold text-signal-growth";
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div
        className={`mt-1 break-words text-sm ${tone ? toneCls : accent ? "text-lg font-bold text-signal-growth" : "text-slate-200"}`}
      >
        {children}
      </div>
    </div>
  );
}
