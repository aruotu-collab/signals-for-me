import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { type BriefRow } from "@/lib/brief";
import { resolveBrief } from "@/lib/briefRequest";
import { getCurrentUser } from "@/lib/session";
import { savedSignalIds } from "@/lib/shortlist";
import { OpportunityTable } from "@/components/OpportunityTable";
import { LensBoard } from "@/components/LensBoard";
import { BUSINESS_TYPES, formatGBP, formatGBPSigned, type GrowthGoal } from "@/lib/opportunity";

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

  // Resolve business/location/goal (URL or saved profile), build + score the
  // brief and roll it up into lenses. Shared with /summary so the two stay in
  // sync. The lens roll-up is the spine of this page.
  const {
    formBusiness,
    business,
    location,
    goal,
    usingGenericDefault,
    fromProfile,
    btLabel,
    lensOptions,
    lensKeys,
    result,
    board,
    lensGroups,
  } = await resolveBrief(sp, user, { limit: 12 });

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
  const kind = lensKeys.includes(sp.kind ?? "") ? (sp.kind as string) : undefined;
  const urgFilter = ["high", "medium", "low"].includes(sp.urg ?? "") ? (sp.urg as string) : undefined;
  const minValue = Number(sp.min) > 0 ? Number(sp.min) : 0;

  let displayed: BriefRow[] = result ? result.rows.slice() : [];
  if (kind) displayed = displayed.filter((r) => r.opportunity.lensKey === kind);
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

  // Links from the Lens Board preserve context + the current sort/view so
  // drilling into a lens never loses the user's setup.
  const lensBase: Record<string, string> = { ...ctxParams };
  if (sort !== "expected") lensBase.sort = sort;
  if (layout !== "table") lensBase.view = layout;

  const activeLens = kind ? lensGroups.find((g) => g.key === kind) ?? null : null;

  // A combined "play" for the active lens: the distinct action steps across its
  // opportunities, in priority order, capped to a tight checklist.
  const lensPlan: string[] = [];
  if (activeLens) {
    const seen = new Set<string>();
    for (const r of displayed) {
      for (const step of r.opportunity.actionPlan) {
        const k = step.trim().toLowerCase();
        if (k && !seen.has(k)) {
          seen.add(k);
          lensPlan.push(step);
        }
      }
    }
  }
  const lensPlanTop = lensPlan.slice(0, 5);
  // Shareable deep-link to this exact lens view.
  const shareHref = activeLens ? `/brief?${new URLSearchParams({ ...lensBase, kind: activeLens.key }).toString()}` : "";

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">Opportunity Brief</h1>
        <p className="text-sm text-slate-400">
          Turn live market signals into revenue opportunities — estimated value and a recommended
          action, tailored to your business and location.
        </p>
        {result && !usingGenericDefault && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] uppercase tracking-wide text-slate-500">Your lenses:</span>
            {lensOptions
              .filter((l) => l.key !== "other")
              .map((l) => (
                <span key={l.key} className="chip bg-white/5 text-slate-300">
                  {l.label}
                </span>
              ))}
          </div>
        )}
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
                  {lensOptions.map((l) => (
                    <option key={l.key} value={l.key}>
                      {l.label}
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
          {/* Compact KPI strip — the full executive scoreboard lives on its own
              page so the lenses + search own this view. */}
          <div className="mb-6 flex flex-wrap items-stretch gap-3">
            <Kpi label="Net opportunity" value={formatGBPSigned(board.netOpportunity)} tone={board.netOpportunity >= 0 ? "growth" : "risk"} />
            <Kpi label="Expected value" value={formatGBP(board.expectedGain)} tone="growth" />
            <Kpi label="At risk" value={board.expectedRisk > 0 ? formatGBP(board.expectedRisk) : "£0"} tone="risk" />
            <Kpi label="Opportunities" value={`${board.count} · ${lensGroups.length} ${lensGroups.length === 1 ? "lens" : "lenses"}`} tone="neutral" />
            <Link
              href={`/summary${Object.keys(ctxParams).length ? `?${new URLSearchParams(ctxParams).toString()}` : ""}`}
              className="card flex min-w-[150px] flex-1 items-center justify-center gap-1 border-white/10 px-4 py-3 text-sm font-medium text-brand-200 transition hover:border-brand-400/40 hover:text-brand-100"
            >
              Full summary →
            </Link>
          </div>

          <LensBoard groups={lensGroups} base={lensBase} activeKey={kind} />

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

          {result.rows.length === 0 ? (
            <p className="text-sm text-slate-400">No signals available.</p>
          ) : !activeLens ? (
            // Lenses-only home: no flat list. Choose a lens to see its opportunities.
            <div className="card border-dashed border-white/15 p-6 text-center">
              <p className="text-sm font-medium text-white">Pick a lens to dive in.</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">
                Each lens above is a revenue bucket for your business, sized by expected value. Open one
                to see its opportunities, a combined action plan, and head-to-head comparison.
              </p>
              {lensGroups[0] && (
                <Link
                  href={`/brief?${new URLSearchParams({ ...lensBase, kind: lensGroups[0].key }).toString()}`}
                  className="btn-primary mt-4 inline-block px-5 py-2.5"
                >
                  Open “{lensGroups[0].label}” →
                </Link>
              )}
            </div>
          ) : (
            <>
              {/* Lens detail: totals + a combined play, then the opportunities. */}
              <div className="card mb-4 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-white">{activeLens.label}</h2>
                      {activeLens.defensive && (
                        <span className="chip bg-signal-distress/15 text-signal-distress">defend</span>
                      )}
                      {activeLens.urgentCount > 0 && (
                        <span className="chip bg-signal-buying/15 text-signal-buying">
                          {activeLens.urgentCount} urgent
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      <span className={activeLens.defensive ? "font-semibold text-signal-distress" : "font-semibold text-signal-growth"}>
                        {formatGBPSigned(activeLens.expectedValue)}
                      </span>{" "}
                      expected value · {activeLens.count}{" "}
                      {activeLens.count === 1 ? "opportunity" : "opportunities"}
                      {activeLens.topRoi > 0 ? ` · up to ${activeLens.topRoi}x ROI` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href={shareHref} className="btn-ghost whitespace-nowrap text-xs" title="Shareable link to this lens">
                      Share lens
                    </Link>
                    <Link href="/shortlist" className="btn-ghost whitespace-nowrap text-xs">
                      Portfolio
                    </Link>
                    <Link
                      href={`/areas?business=${encodeURIComponent(business)}`}
                      className="btn-ghost whitespace-nowrap text-xs"
                    >
                      Top postcodes →
                    </Link>
                  </div>
                </div>

                {lensPlanTop.length > 0 && (
                  <div className="mt-4 rounded-xl border border-signal-hiring/30 bg-signal-hiring/[0.06] p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-signal-hiring">
                      Recommended play for this lens
                    </div>
                    <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-200">
                      {lensPlanTop.map((step, i) => (
                        <li key={i} className="break-words">
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>

              <div className="mb-3 flex items-end justify-between gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                  Opportunities in this lens
                </h3>
                <span className="text-xs text-slate-500">Sort above · tick rows to compare</span>
              </div>

              {layout === "table" ? (
                <OpportunityTable items={displayed} compareBase={ctxParams} />
              ) : (
                <div className="space-y-4">
                  {displayed.map((row) => (
                    <OpportunityCard key={row.signal.id} row={row} />
                  ))}
                </div>
              )}
            </>
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

function Kpi({ label, value, tone }: { label: string; value: string; tone: "growth" | "risk" | "neutral" }) {
  const color = tone === "growth" ? "text-signal-growth" : tone === "risk" ? "text-signal-distress" : "text-white";
  return (
    <div className="card min-w-[150px] flex-1 px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-0.5 text-xl font-bold ${color}`}>{value}</div>
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
