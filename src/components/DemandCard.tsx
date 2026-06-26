import Link from "next/link";
import { DemandMeter } from "@/components/DemandMeter";
import { categoryIcon, categoryLabel, type DemandStats } from "@/lib/demand";

export function DemandCard({
  id,
  title,
  description,
  category,
  location,
  stats,
}: {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string | null;
  stats: DemandStats;
}) {
  const totalVotes = Object.values(stats.voteCounts).reduce((a, b) => a + b, 0);

  return (
    <Link href={`/ideas/${id}`} className="card group block p-5 transition hover:border-brand-400/30 hover:bg-ink-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg">{categoryIcon(category)}</span>
            <span className="chip bg-white/5 text-slate-400">{categoryLabel(category)}</span>
            {location && <span className="chip bg-white/5 text-slate-500">📍 {location}</span>}
          </div>
          <h3 className="mt-2 text-lg font-semibold text-white group-hover:text-brand-200">{title}</h3>
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-400">{description}</p>
        </div>
      </div>

      <div className="mt-4">
        <DemandMeter stats={stats} compact />
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
        <span>{totalVotes.toLocaleString()} votes</span>
        <span>{stats.commentCount} comments</span>
        {stats.voteCounts.would_pay ? (
          <span className="text-signal-growth">{stats.voteCounts.would_pay} would pay</span>
        ) : null}
        {stats.voteCounts.waitlist ? (
          <span className="text-brand-300">{stats.voteCounts.waitlist} on waitlist</span>
        ) : null}
      </div>
    </Link>
  );
}
