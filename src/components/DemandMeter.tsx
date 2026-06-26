import type { DemandStats } from "@/lib/demand";

const STRENGTH_COLORS: Record<DemandStats["strength"], string> = {
  Low: "bg-slate-500/20 text-slate-300",
  Moderate: "bg-amber-500/20 text-amber-200",
  High: "bg-orange-500/20 text-orange-200",
  "Very High": "bg-rose-500/20 text-rose-200",
};

const BAR_COLORS: Record<DemandStats["strength"], string> = {
  Low: "bg-slate-400",
  Moderate: "bg-amber-400",
  High: "bg-orange-400",
  "Very High": "bg-rose-400",
};

export function DemandMeter({
  stats,
  compact = false,
}: {
  stats: DemandStats;
  compact?: boolean;
}) {
  const pct = Math.min(100, Math.round((stats.demandScore / 8000) * 100));

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
          <div className={`h-full rounded-full ${BAR_COLORS[stats.strength]}`} style={{ width: `${pct}%` }} />
        </div>
        <span className={`chip ${STRENGTH_COLORS[stats.strength]}`}>{stats.strength}</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Demand Score</div>
          <div className="text-2xl font-bold text-white">{stats.demandScore.toLocaleString()}</div>
        </div>
        <span className={`chip ${STRENGTH_COLORS[stats.strength]}`}>{stats.strength}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full transition-all ${BAR_COLORS[stats.strength]}`} style={{ width: `${pct}%` }} />
      </div>
      {stats.growth7d !== 0 && (
        <div className={`text-xs ${stats.growth7d > 0 ? "text-signal-growth" : "text-signal-distress"}`}>
          {stats.growth7d > 0 ? "+" : ""}
          {stats.growth7d}% demand growth (7d)
        </div>
      )}
    </div>
  );
}
