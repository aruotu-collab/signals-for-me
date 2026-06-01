import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { buildBrief, type BriefRow } from "@/lib/brief";
import { getCurrentUser } from "@/lib/session";
import { savedSignalIds } from "@/lib/shortlist";
import { Scoreboard } from "@/components/Scoreboard";
import { OpportunityTable } from "@/components/OpportunityTable";
import { computeScoreboard } from "@/lib/scoreboard";
import { BUSINESS_TYPES, formatGBP, formatGBPSigned, type Archetype, type GrowthGoal } from "@/lib/opportunity";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Opportunity Brief",
  description:
    "Turn live market signals into revenue opportunities for your business — with estimated value and a recommended action.",
};

type SP = {
  business?: string;
  location?: string;
  goal?: string;
  audience?: string;
  view?: string;
  sort?: string;
  kind?: string;
  urg?: string;
  min?: string;
};

const GOALS: GrowthGoal[] = ["leads", "revenue", "locations", "hiring", "partnerships"];
const SORTS = ["expected", "roi", "value", "confidence", "urgency", "recent"] as const;
type Sort = (typeof SORTS)[number];
const ARCHETYPES: Archetype[] = ["new_resident", "employer", "competitor", "demand"];
const ARCHETYPE_LABELS: Record<Archetype, string> = {
  new_resident: "New residents",
  employer: "New employers",
  competitor: "Competitor / threats",
  demand: "Market demand",
};
const URGENCY_RANK: Record<string, number> = { high: 3, medium: 2, low: 1 };

export default async function BriefPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;

  // Opportunity-first home: a signed-in user with a saved business profile gets
  // their brief auto-generated — no form to fill in. Query params still override
  // so anyone can run an ad-hoc scenario.
  const user = await getCurrentUser();

  // Brand-new signed-in users (no interests and no profile yet) set up first.
  // redirect() throws by design, so it stays outside any try/catch.
  if (user && user.subscriptions.length === 0 && !user.businessType) {
    redirect("/onboarding");
  }

  const profileBusiness = user?.businessType ?? "";
  const profileLocation = user?.location ?? "";
  const profileGoal = user?.growthGoal ?? "";

  // What the user explicitly chose (query) or saved (profile). Drives the form.
  const formBusiness = (sp.business || profileBusiness).trim();
  const location = (sp.location || profileLocation).trim();
  const goalRaw = (sp.goal || profileGoal).trim();
  const goal = (GOALS as string[]).includes(goalRaw) ? (goalRaw as GrowthGoal) : undefined;
  const audience = sp.audience === "consumer" ? "consumer" : sp.audience === "business" ? "business" : undefined;

  // A signed-in user should always get a brief. If they haven't set a business
  // type yet, fall back to general estimates and nudge them to personalize —
  // otherwise the "My Opportunities" CTA would just show an empty form.
  const usingGenericDefault = !formBusiness && !!user;
  const business = formBusiness || (usingGenericDefault ? "generic" : "");

  const hasQuery = business.length > 0;
  // True when the brief was auto-generated from the saved profile (no explicit
  // business type in the URL), so we can offer an "edit profile" hint.
  const fromProfile = !sp.business && !!profileBusiness;

  const result = hasQuery
    ? await buildBrief({ businessTypeKey: business, location, growthGoal: goal, audience, limit: 12 })
    : null;

  const btLabel = usingGenericDefault
    ? "your business"
    : BUSINESS_TYPES.find((b) => b.key === business)?.label ?? "Your business";

  // Scoreboard reflects the whole opportunity set; the table/cards below reflect
  // the active filters + sort.
  const board = result ? computeScoreboard(result.rows) : null;

  // "Missed opportunity": expected upside the user hasn't shortlisted yet — a
  // gentle nudge to start acting on (and saving) opportunities.
  let missedValue = 0;
  let missedCount = 0;
  if (user && result) {
    const saved = new Set(await savedSignalIds(user.id));
    for (const r of result.rows) {
      if (r.opportunity.expectedValue > 0 && !saved.has(r.signal.id)) {
        missedValue += r.opportunity.expectedValue;
        missedCount += 1;
      }
    }
  }

  const layout = sp.view === "cards" ? "cards" : "table";
  const sort: Sort = (SORTS as readonly string[]).includes(sp.sort ?? "") ? (sp.sort as Sort) : "expected";
  const kind = (ARCHETYPES as string[]).includes(sp.kind ?? "") ? (sp.kind as Archetype) : undefined;
  const urgFilter = ["high", "medium", "low"].includes(sp.urg ?? "") ? (sp.urg as string) : undefined;
  const minValue = Number(sp.min) > 0 ? Number(sp.min) : 0;

  let displayed: BriefRow[] = result ? result.rows.slice() : [];
  if (kind) displayed = displayed.filter((r) => r.opportunity.archetype === kind);
  if (urgFilter) displayed = displayed.filter((r) => r.opportunity.urgency === urgFilter);
  if (minValue) {
    displayed = displayed.filter(
      (r) => Math.max(r.opportunity.valueHigh, r.opportunity.riskHigh) >= minValue,
    );
  }
  displayed.sort((a, b) => {
    const A = a.opportunity;
    const B = b.opportunity;
    if (sort === "expected") return B.expectedValue - A.expectedValue;
    if (sort === "roi") return B.roi - A.roi;
    if (sort === "confidence") return b.signal.confidence - a.signal.confidence;
    if (sort === "recent") return Date.parse(b.signal.detectedAt) - Date.parse(a.signal.detectedAt);
    if (sort === "urgency") {
      const d = URGENCY_RANK[B.urgency] - URGENCY_RANK[A.urgency];
      if (d) return d;
    }
    return Math.max(B.valueHigh, B.riskHigh) - Math.max(A.valueHigh, A.riskHigh);
  });

  // Carry the brief context (business/location/goal) through the filter form.
  const ctxParams: Record<string, string> = {};
  if (sp.business || formBusiness) ctxParams.business = business;
  if (location) ctxParams.location = location;
  if (goal) ctxParams.goal = goal;

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">Opportunity Brief</h1>
        <p className="text-sm text-slate-400">
          Turn live market signals into revenue opportunities — estimated value and a recommended
          action, tailored to your business and location.
        </p>
      </header>

      {/* One unified control panel: business context + comparison filters in a
          single form, so everything submits together and stays in sync. */}
      <form method="get" className="card mb-6 p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:items-end">
          <Field label="Your business type">
            <select name="business" defaultValue={formBusiness} className={inputCls} required>
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
        </div>

        {result && (
          <>
            <div className="my-4 border-t border-white/10" />
            <div className="flex flex-wrap items-end gap-2">
              <Mini label="View">
                <select name="view" defaultValue={layout} className={miniCls}>
                  <option value="table">Table</option>
                  <option value="cards">Cards</option>
                </select>
              </Mini>
              <Mini label="Sort by">
                <select name="sort" defaultValue={sort} className={miniCls}>
                  <option value="expected">Expected value</option>
                  <option value="roi">Highest ROI</option>
                  <option value="value">Highest value</option>
                  <option value="confidence">Highest confidence</option>
                  <option value="urgency">Most urgent</option>
                  <option value="recent">Most recent</option>
                </select>
              </Mini>
              <Mini label="Type">
                <select name="kind" defaultValue={kind ?? ""} className={miniCls}>
                  <option value="">All types</option>
                  {ARCHETYPES.map((a) => (
                    <option key={a} value={a}>
                      {ARCHETYPE_LABELS[a]}
                    </option>
                  ))}
                </select>
              </Mini>
              <Mini label="Urgency">
                <select name="urg" defaultValue={urgFilter ?? ""} className={miniCls}>
                  <option value="">Any</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </Mini>
              <Mini label="Min value">
                <select name="min" defaultValue={minValue ? String(minValue) : ""} className={miniCls}>
                  <option value="">Any</option>
                  <option value="10000">£10k+</option>
                  <option value="50000">£50k+</option>
                  <option value="100000">£100k+</option>
                </select>
              </Mini>
            </div>
          </>
        )}

        <div className="mt-4">
          <button type="submit" className="btn-primary h-[42px] whitespace-nowrap px-5">
            Update scoreboard
          </button>
        </div>
      </form>

      {fromProfile && (
        <p className="-mt-4 mb-6 text-xs text-slate-500">
          Auto-generated from your saved profile.{" "}
          <Link href="/onboarding" className="text-slate-300 underline hover:text-white">
            Edit your profile
          </Link>
        </p>
      )}

      {usingGenericDefault && (
        <div className="-mt-4 mb-6 rounded-xl border border-signal-buying/30 bg-signal-buying/10 p-3 text-sm text-signal-buying">
          Showing <span className="font-medium">general estimates</span>. Pick your business type above — or{" "}
          <Link href="/onboarding" className="underline hover:text-white">
            complete your profile
          </Link>{" "}
          — for revenue numbers tailored to your business.
        </div>
      )}

      {!result && <EmptyState />}

      {result && board && (
        <section>
          <Scoreboard board={board} businessLabel={btLabel} location={location} />

          {missedCount > 0 && missedValue > 0 && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-signal-buying/30 bg-signal-buying/10 p-3 text-sm">
              <span className="text-signal-buying">
                You&apos;re not yet acting on{" "}
                <span className="font-bold">{formatGBP(missedValue)}</span> of expected value across{" "}
                <span className="font-bold">{missedCount}</span>{" "}
                {missedCount === 1 ? "opportunity" : "opportunities"}.
              </span>
              <span className="text-xs text-slate-400">Tick rows and save them to build your portfolio.</span>
            </div>
          )}

          {result.fallback && !usingGenericDefault && (
            <p className="mb-4 rounded-xl border border-signal-buying/30 bg-signal-buying/10 p-3 text-sm text-signal-buying">
              No signals matched that exact profile yet, so we&apos;re showing the strongest current
              signals translated for your business. As local & industry sources are added, this brief
              gets sharper.
            </p>
          )}

          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Compare opportunities
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Sort by any column, then tick rows to put them head-to-head.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/shortlist" className="btn-ghost whitespace-nowrap text-sm">
                Portfolio
              </Link>
              <Link
                href={`/areas?business=${encodeURIComponent(business)}`}
                className="btn-ghost whitespace-nowrap text-sm"
              >
                See top postcodes →
              </Link>
            </div>
          </div>

          {result.rows.length === 0 ? (
            <p className="text-sm text-slate-400">No signals available.</p>
          ) : layout === "table" ? (
            <OpportunityTable items={displayed} compareBase={ctxParams} />
          ) : (
            <div className="space-y-4">
              {displayed.map((row) => (
                <OpportunityCard key={row.signal.id} row={row} />
              ))}
            </div>
          )}

          <p className="mt-6 text-xs text-slate-600">
            Revenue figures are estimates based on public UK benchmarks (ONS household size, sector
            fee/value averages) and conservative capture-rate assumptions shown on each card or row.
            They are indicative, not guarantees.
          </p>
        </section>
      )}
    </div>
  );
}

function Mini({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-slate-500">{label}</span>
      {children}
    </label>
  );
}

const miniCls =
  "rounded-lg border border-white/10 bg-ink-900/70 px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none [&>option]:bg-ink-900 [&>option]:text-white";

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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Expected value" tone={opp.expectedValue >= 0 ? "growth" : "risk"}>
          {formatGBPSigned(opp.expectedValue)}
        </Stat>
        <Stat label={opp.basis === "at risk" ? "Revenue at risk" : "Revenue potential"}>
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
      <div className={`mt-1 break-words text-sm ${tone ? toneCls : accent ? "text-lg font-bold text-signal-growth" : "text-slate-200"}`}>
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
  "w-full rounded-xl border border-white/10 bg-ink-900/70 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-brand-500 focus:outline-none [&>option]:bg-ink-900 [&>option]:text-white";
