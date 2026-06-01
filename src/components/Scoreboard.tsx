import Link from "next/link";
import { formatGBP, formatGBPSigned } from "@/lib/opportunity";
import type { Scoreboard as ScoreboardData, ScoredItem } from "@/lib/scoreboard";

// The Executive Briefing: a "scoreboard of money" rather than a feed of news.
// Big numbers first (opportunity £, risk £, counts), then a headline score, then
// the single most important opportunity and the single biggest threat.
export function Scoreboard({
  board,
  businessLabel,
  location,
  heading = "Your business this month",
  lensCount,
}: {
  board: ScoreboardData;
  businessLabel: string;
  location?: string;
  heading?: string;
  /** how many opportunity lenses are in play — shown in the sub-line */
  lensCount?: number;
}) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">{heading}</h2>
        <span className="text-xs text-slate-500">
          {businessLabel}
          {location ? ` · ${location}` : ""}
          {lensCount ? ` · ${board.count} opportunities across ${lensCount} ${lensCount === 1 ? "lens" : "lenses"}` : ""}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Tile
          label="Net opportunity"
          value={formatGBPSigned(board.netOpportunity)}
          hint="expected gain − risk"
          tone={board.netOpportunity >= 0 ? "growth" : "risk"}
          big
        />
        <Tile
          label="Expected value"
          value={formatGBP(board.expectedGain)}
          hint="confidence-weighted upside"
          tone="growth"
          big
        />
        <Tile
          label="Revenue at risk"
          value={board.expectedRisk > 0 ? formatGBP(board.expectedRisk) : "£0"}
          hint="confidence-weighted"
          tone="risk"
          big
        />
        <Tile
          label="Revenue opportunities"
          value={`${formatGBP(board.opportunityLow)}–${formatGBP(board.opportunityHigh)}`}
          tone="growth"
        />
        <Tile label="Opportunities detected" value={String(board.count)} tone="neutral" />
        <Tile label="Urgent actions" value={String(board.urgentCount)} tone="urgent" />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[auto_1fr_1fr]">
        <ScoreCard score={board.score} />
        {board.topOpportunity ? (
          <TopCard kind="opportunity" item={board.topOpportunity} />
        ) : (
          <EmptyCard text="No opportunities matched yet — add local & industry sources to sharpen this." />
        )}
        {board.topRisk ? (
          <TopCard kind="risk" item={board.topRisk} />
        ) : (
          <EmptyCard text="No active competitor threats detected. Keep monitoring." positive />
        )}
      </div>
    </section>
  );
}

function Tile({
  label,
  value,
  hint,
  tone,
  big,
}: {
  label: string;
  value: string;
  hint?: string;
  tone: "growth" | "risk" | "urgent" | "neutral";
  big?: boolean;
}) {
  const color =
    tone === "growth"
      ? "text-signal-growth"
      : tone === "risk"
        ? "text-signal-distress"
        : tone === "urgent"
          ? "text-signal-buying"
          : "text-white";
  return (
    <div className="card min-w-0 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-1 font-bold [overflow-wrap:anywhere] ${color} ${big ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"}`}>{value}</div>
      {hint && <div className="mt-0.5 text-[10px] text-slate-500">{hint}</div>}
    </div>
  );
}

function ScoreCard({ score }: { score: number }) {
  const tone = score >= 70 ? "text-signal-growth" : score >= 45 ? "text-signal-buying" : "text-slate-300";
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-4 text-center">
      <div className={`text-4xl font-bold ${tone}`}>{score}</div>
      <div className="text-[10px] uppercase tracking-wide text-slate-500">/ 100</div>
      <div className="mt-1 text-[11px] font-medium text-slate-400">Opportunity score</div>
    </div>
  );
}

function TopCard({ kind, item }: { kind: "opportunity" | "risk"; item: ScoredItem }) {
  const { signal, opportunity: o } = item;
  const isRisk = kind === "risk";
  const accent = isRisk ? "text-signal-distress" : "text-signal-growth";
  const border = isRisk
    ? "border-signal-distress/30 bg-signal-distress/[0.05]"
    : "border-signal-growth/30 bg-signal-growth/[0.05]";
  const headline = isRisk
    ? o.riskHigh > 0
      ? `${formatGBP(o.riskLow)}–${formatGBP(o.riskHigh)} at risk`
      : "Threat detected"
    : `${formatGBP(o.valueLow)}–${formatGBP(o.valueHigh)}`;

  return (
    <div className={`card min-w-0 border ${border} p-4`}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {isRisk ? "Top threat" : "Top opportunity"}
        </div>
        <span className="text-[10px] uppercase tracking-wide text-slate-500">
          {Math.round(signal.confidence * 100)}% confidence
        </span>
      </div>
      <div className={`mt-1 text-xl font-bold [overflow-wrap:anywhere] ${accent}`}>{headline}</div>
      <Link
        href={`/signals/${signal.id}`}
        className="mt-0.5 block truncate text-xs text-slate-400 hover:text-slate-200 hover:underline"
        title={signal.title}
      >
        {o.label} · {signal.title}
      </Link>
      <p className="mt-2 line-clamp-2 text-xs text-slate-300">
        <span className="font-medium text-slate-200">Action:</span> {o.action}
      </p>
    </div>
  );
}

function EmptyCard({ text, positive }: { text: string; positive?: boolean }) {
  return (
    <div className="card flex items-center p-4">
      <p className={`text-xs ${positive ? "text-signal-growth" : "text-slate-400"}`}>{text}</p>
    </div>
  );
}
