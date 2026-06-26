import Link from "next/link";
import { DemandMeter } from "@/components/DemandMeter";
import { GeoDemandPanel } from "@/components/GeoDemandPanel";
import { canAccessDashboard, canAccessProInsights } from "@/lib/billing";
import {
  categoryIcon,
  categoryLabel,
  estimateRevenue,
  formatFrequency,
  formatPriceBand,
  getDashboardSummary,
} from "@/lib/demand";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const plan = user?.plan ?? "free";
  const hasAccess = canAccessDashboard(plan);
  const hasPro = canAccessProInsights(plan);

  const summary = await getDashboardSummary();

  if (!hasAccess) {
    return (
      <div className="mx-auto max-w-2xl text-center">
        <span className="chip border border-white/10 bg-white/5 text-slate-300">Business Intelligence</span>
        <h1 className="mt-3 text-3xl font-bold text-white">Demand Intelligence Dashboard</h1>
        <p className="mt-3 text-slate-400">
          See what customers actually want — before you invest time and money building it. Demographics, geography,
          pricing intent, and demand trends in one place.
        </p>
        <div className="card mt-8 p-8">
          <div className="text-4xl">📊</div>
          <h2 className="mt-4 text-xl font-semibold text-white">Unlock the dashboard</h2>
          <p className="mt-2 text-sm text-slate-400">
            {summary.totalIdeas} demand ideas · {summary.totalVotes.toLocaleString()} votes collected
          </p>
          <Link href="/pricing" className="btn-primary mt-6 inline-flex px-6 py-3">
            View business plans
          </Link>
          {!user && (
            <p className="mt-4 text-sm text-slate-500">
              Already subscribed?{" "}
              <Link href="/login?callbackUrl=/dashboard" className="text-brand-300 underline">
                Sign in
              </Link>
            </p>
          )}
        </div>

        {/* Preview teaser */}
        <div className="mt-8 text-left">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Preview — top demands</h3>
          <div className="mt-3 space-y-3">
            {summary.topDemands.slice(0, 3).map((idea, i) => (
              <div key={idea.id} className="card flex items-center gap-4 p-4 opacity-60">
                <div className="text-2xl font-bold text-slate-600">#{i + 1}</div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-white blur-[2px]">{idea.title}</div>
                  <div className="text-xs text-slate-500">Upgrade to see full details</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="chip border border-white/10 bg-white/5 text-slate-300">Business Intelligence</span>
          <h1 className="mt-3 text-3xl font-bold text-white">Demand Intelligence Dashboard</h1>
          <p className="mt-2 text-slate-400">
            Real customer demand data — what people want, where they want it, and what they&apos;ll pay.
          </p>
        </div>
        {!hasPro && (
          <Link href="/pricing" className="btn-ghost shrink-0 px-4 py-2 text-sm">
            Upgrade for demographics →
          </Link>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Total demand ideas" value={String(summary.totalIdeas)} />
        <Kpi label="Total votes" value={summary.totalVotes.toLocaleString()} />
        <Kpi label="Categories tracked" value={String(summary.topCategories.length)} />
        <Kpi label="Community ideas" value={String(summary.unserved.length)} />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Top demands */}
        <section className="card p-5">
          <h2 className="text-lg font-semibold text-white">Top Emerging Demands</h2>
          <p className="mt-1 text-sm text-slate-400">Ranked by demand score</p>
          <div className="mt-4 space-y-3">
            {summary.topDemands.map((idea, i) => {
              const rev = estimateRevenue(idea.stats);
              return (
                <Link
                  key={idea.id}
                  href={`/ideas/${idea.id}`}
                  className="block rounded-xl border border-white/5 bg-white/[0.02] p-4 transition hover:border-brand-400/20"
                >
                  <div className="flex items-start gap-3">
                    <div className="text-lg font-bold text-slate-600">#{i + 1}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span>{categoryIcon(idea.category)}</span>
                        <span className="font-medium text-white">{idea.title}</span>
                      </div>
                      <DemandMeter stats={idea.stats} compact />
                      {hasPro && rev.high > 0 && (
                        <div className="mt-2 text-xs text-signal-growth">
                          Est. monthly revenue: £{rev.low.toLocaleString()}–£{rev.high.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Trending */}
        <section className="card p-5">
          <h2 className="text-lg font-semibold text-white">Trending (7-day growth)</h2>
          <p className="mt-1 text-sm text-slate-400">Fastest growing demand signals</p>
          <div className="mt-4 space-y-3">
            {summary.trending.map((idea) => (
              <Link
                key={idea.id}
                href={`/ideas/${idea.id}`}
                className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-4 transition hover:border-brand-400/20"
              >
                <div className="min-w-0">
                  <div className="font-medium text-white">{idea.title}</div>
                  <div className="text-xs text-slate-500">{categoryLabel(idea.category)}</div>
                </div>
                <div className={`text-sm font-bold ${idea.stats.growth7d > 0 ? "text-signal-growth" : "text-slate-400"}`}>
                  {idea.stats.growth7d > 0 ? "+" : ""}
                  {idea.stats.growth7d}%
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* Categories */}
      <section className="card p-5">
        <h2 className="text-lg font-semibold text-white">Demand by Category</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {summary.topCategories.map((cat) => (
            <div key={cat.key} className="rounded-xl bg-white/5 p-4 text-center">
              <div className="text-2xl">{categoryIcon(cat.key)}</div>
              <div className="mt-1 text-xs text-slate-400">{cat.label}</div>
              <div className="mt-1 text-lg font-bold text-white">{cat.score.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Unserved demand */}
      <section className="card p-5">
        <h2 className="text-lg font-semibold text-white">Unserved Demand — Community Ideas</h2>
        <p className="mt-1 text-sm text-slate-400">Ideas submitted by users that no business is tracking yet</p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {summary.unserved.map((idea) => {
            const oppScore = Math.min(100, Math.round((idea.stats.demandScore / 100) + (idea.stats.voteCounts.would_pay ?? 0) * 2));
            return (
              <Link
                key={idea.id}
                href={`/ideas/${idea.id}`}
                className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 transition hover:border-purple-400/30"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white">{idea.title}</span>
                  {hasPro && (
                    <span className="chip bg-purple-500/20 text-purple-200">Score {oppScore}/100</span>
                  )}
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-slate-400">{idea.description}</p>
                <div className="mt-2 text-xs text-slate-500">
                  {idea.stats.demandScore.toLocaleString()} demand score · {idea.stats.commentCount} comments
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Pro insights */}
      {hasPro && summary.topDemands[0] && (
        <section className="card p-5">
          <h2 className="text-lg font-semibold text-white">Deep Dive — {summary.topDemands[0].title}</h2>
          <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-400">Geography</h3>
              <div className="mt-2">
                <GeoDemandPanel geo={summary.topDemands[0].stats.geo} />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-400">Demographics</h3>
              <div className="mt-2 space-y-1">
                {summary.topDemands[0].stats.demographics.ageRanges.map((a) => (
                  <div key={a.label} className="flex justify-between text-sm">
                    <span className="text-slate-300">Age {a.label}</span>
                    <span className="text-white">{a.count}</span>
                  </div>
                ))}
                {summary.topDemands[0].stats.demographics.parents > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-300">Parents</span>
                    <span className="text-white">{summary.topDemands[0].stats.demographics.parents}</span>
                  </div>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-400">Pricing & Urgency</h3>
              <dl className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-300">Willing to pay</dt>
                  <dd className="text-white">{formatPriceBand(summary.topDemands[0].stats.topPriceBand)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-300">Frequency</dt>
                  <dd className="text-white">{formatFrequency(summary.topDemands[0].stats.topFrequency)}</dd>
                </div>
              </dl>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4 text-center">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-white">{value}</div>
    </div>
  );
}
