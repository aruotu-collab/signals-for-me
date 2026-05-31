import type { Metadata } from "next";
import Link from "next/link";
import { buildBrief, type BriefRow } from "@/lib/brief";
import { BUSINESS_TYPES, formatGBP, type GrowthGoal } from "@/lib/opportunity";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Opportunity Brief",
  description:
    "Turn live market signals into revenue opportunities for your business — with estimated value and a recommended action.",
};

type SP = { business?: string; location?: string; goal?: string; audience?: string };

const GOALS: GrowthGoal[] = ["leads", "revenue", "locations", "hiring", "partnerships"];

export default async function BriefPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const business = (sp.business ?? "").trim();
  const location = (sp.location ?? "").trim();
  const goal = (GOALS as string[]).includes(sp.goal ?? "") ? (sp.goal as GrowthGoal) : undefined;
  const audience = sp.audience === "consumer" ? "consumer" : sp.audience === "business" ? "business" : undefined;
  const hasQuery = business.length > 0;

  const result = hasQuery
    ? await buildBrief({ businessTypeKey: business, location, growthGoal: goal, audience, limit: 12 })
    : null;

  const btLabel = BUSINESS_TYPES.find((b) => b.key === business)?.label ?? "Your business";

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">Opportunity Brief</h1>
        <p className="text-sm text-slate-400">
          Turn live market signals into revenue opportunities — estimated value and a recommended
          action, tailored to your business and location.
        </p>
      </header>

      <form method="get" className="card mb-8 grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_auto] lg:items-end">
        <Field label="Your business type">
          <select name="business" defaultValue={business} className={inputCls} required>
            <option value="" disabled>
              Select…
            </option>
            {BUSINESS_TYPES.map((b) => (
              <option key={b.key} value={b.key}>
                {b.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Location">
          <input name="location" defaultValue={location} placeholder="e.g. Catford, SE6" className={inputCls} />
        </Field>
        <Field label="Goal (optional)">
          <select name="goal" defaultValue={goal ?? ""} className={inputCls}>
            <option value="">Any</option>
            {GOALS.map((g) => (
              <option key={g} value={g}>
                {g[0].toUpperCase() + g.slice(1)}
              </option>
            ))}
          </select>
        </Field>
        <button type="submit" className="btn-primary h-[42px] whitespace-nowrap">
          Build brief
        </button>
      </form>

      {!result && <EmptyState />}

      {result && (
        <section>
          <div className="card mb-6 flex flex-wrap items-center justify-between gap-3 border-signal-growth/20 p-5">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">
                Estimated opportunity · {btLabel}
                {location ? ` · ${location}` : ""}
              </div>
              <div className="mt-1 text-3xl font-bold text-white">
                {formatGBP(result.totalRevenueLow)}–{formatGBP(result.totalRevenueHigh)}
              </div>
              <div className="text-xs text-slate-500">
                across {result.rows.filter((r) => !r.opportunity.defensive).length} opportunities · estimates only, see assumptions
              </div>
            </div>
          </div>

          {result.fallback && (
            <p className="mb-4 rounded-xl border border-signal-buying/30 bg-signal-buying/10 p-3 text-sm text-signal-buying">
              No signals matched that exact profile yet, so we&apos;re showing the strongest current
              signals translated for your business. As local & industry sources are added, this brief
              gets sharper.
            </p>
          )}

          {result.rows.length === 0 ? (
            <p className="text-sm text-slate-400">No signals available.</p>
          ) : (
            <div className="space-y-4">
              {result.rows.map((row) => (
                <OpportunityCard key={row.signal.id} row={row} />
              ))}
            </div>
          )}

          <p className="mt-6 text-xs text-slate-600">
            Revenue figures are estimates based on public UK benchmarks (ONS household size, sector
            fee/value averages) and conservative capture-rate assumptions shown on each card. They
            are indicative, not guarantees.
          </p>
        </section>
      )}
    </div>
  );
}

function OpportunityCard({ row }: { row: BriefRow }) {
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
          <Link href={`/signals/${signal.id}`} className="mt-1 block text-sm text-slate-400 hover:text-slate-200 hover:underline">
            From signal: {signal.title}
          </Link>
        </div>
        <ScoreDial score={opp.score} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label={opp.basis === "at risk" ? "Revenue at risk" : "Revenue potential"} accent>
          {opp.revenueLabel}
        </Stat>
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
  const tone =
    score >= 70 ? "text-signal-growth" : score >= 45 ? "text-signal-buying" : "text-slate-400";
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
}: {
  label: string;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-1 break-words text-sm ${accent ? "text-lg font-bold text-signal-growth" : "text-slate-200"}`}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function EmptyState() {
  return (
    <div className="card p-6 text-sm text-slate-300">
      <p className="font-medium text-white">Try an example</p>
      <p className="mt-1 text-slate-400">
        Pick <span className="text-slate-200">Dental practice</span> and enter{" "}
        <span className="text-slate-200">Catford</span>, then Build brief. Each signal is translated
        into a revenue opportunity for your business — e.g.{" "}
        <span className="text-slate-200">
          &quot;600 new homes → 40–110 new patients → {`${"£"}`}7k–70k/yr → run a mail campaign.&quot;
        </span>
      </p>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-white/10 bg-ink-900/70 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-brand-500 focus:outline-none";
