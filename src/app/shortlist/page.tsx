import type { Metadata } from "next";
import Link from "next/link";
import { buildBriefForIds, type BriefRow } from "@/lib/brief";
import { getCurrentUser } from "@/lib/session";
import { savedSignalIds } from "@/lib/shortlist";
import { BUSINESS_TYPES, formatGBPSigned, type Archetype, type GrowthGoal } from "@/lib/opportunity";
import { computeScoreboard } from "@/lib/scoreboard";
import { Scoreboard } from "@/components/Scoreboard";
import { OpportunityTable } from "@/components/OpportunityTable";

const ARCHETYPE_LABELS: Record<Archetype, string> = {
  new_resident: "New residents",
  employer: "New employers",
  competitor: "Competitor / threats",
  demand: "Market demand",
};

function byType(rows: BriefRow[]): { label: string; total: number }[] {
  const sums = new Map<Archetype, number>();
  for (const r of rows) {
    const a = r.opportunity.archetype;
    sums.set(a, (sums.get(a) ?? 0) + r.opportunity.expectedValue);
  }
  return Array.from(sums.entries())
    .map(([a, total]) => ({ label: ARCHETYPE_LABELS[a], total }))
    .sort((x, y) => y.total - x.total);
}

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Opportunity portfolio",
  robots: { index: false, follow: false },
};

const GOALS: GrowthGoal[] = ["leads", "revenue", "locations", "hiring", "partnerships"];

export default async function ShortlistPage() {
  const user = await getCurrentUser().catch(() => null);

  if (!user) {
    return (
      <div className="card mx-auto max-w-lg p-6 text-center">
        <h1 className="text-xl font-bold text-white">Opportunity portfolio</h1>
        <p className="mt-2 text-sm text-slate-400">
          Sign in to save opportunities and manage them as a portfolio.
        </p>
        <Link href="/login?callbackUrl=/shortlist" className="btn-primary mt-4 inline-block px-5 py-2.5">
          Sign in
        </Link>
      </div>
    );
  }

  const ids = await savedSignalIds(user.id);
  const businessKey = (user.businessType || "generic").trim();
  const location = (user.location || "").trim();
  const goalRaw = (user.growthGoal || "").trim();
  const growthGoal = (GOALS as string[]).includes(goalRaw) ? (goalRaw as GrowthGoal) : undefined;
  const btLabel = BUSINESS_TYPES.find((b) => b.key === businessKey)?.label ?? "your business";

  const rows = ids.length ? await buildBriefForIds(ids, { businessTypeKey: businessKey, location, growthGoal }) : [];
  const compareBase: Record<string, string> = { business: businessKey };
  if (location) compareBase.location = location;
  if (growthGoal) compareBase.goal = growthGoal;
  const compareAll = `/compare?business=${encodeURIComponent(businessKey)}&ids=${rows.slice(0, 4).map((r) => r.signal.id).join(",")}`;

  const board = rows.length ? computeScoreboard(rows) : null;
  const breakdown = byType(rows);

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Opportunity portfolio</h1>
          <p className="mt-1 text-sm text-slate-400">
            Your saved opportunities for a {btLabel.toLowerCase()}{location ? ` in ${location}` : ""} — managed like a
            portfolio, ranked by expected value.
          </p>
        </div>
        {rows.length >= 2 && (
          <Link href={compareAll} className="btn-ghost text-sm">
            Compare top {Math.min(rows.length, 4)} →
          </Link>
        )}
      </header>

      {rows.length === 0 ? (
        <div className="card p-6 text-sm text-slate-300">
          <p className="font-medium text-white">Your portfolio is empty.</p>
          <p className="mt-1 text-slate-400">
            Open any opportunity and choose <span className="text-slate-200">Save to compare</span>, or browse your{" "}
            <Link href="/brief" className="text-brand-300 underline hover:text-white">
              opportunities
            </Link>
            .
          </p>
        </div>
      ) : (
        <>
          {board && <Scoreboard board={board} businessLabel={btLabel} location={location} heading="Portfolio summary" />}

          {breakdown.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">By type</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {breakdown.map((b) => (
                  <div key={b.label} className="card p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{b.label}</div>
                    <div className={`mt-1 text-xl font-bold ${b.total >= 0 ? "text-signal-growth" : "text-signal-distress"}`}>
                      {formatGBPSigned(b.total)}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Holdings</h2>
          <OpportunityTable items={rows} compareBase={compareBase} />
        </>
      )}
    </div>
  );
}
