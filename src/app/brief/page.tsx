import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { resolveBrief } from "@/lib/briefRequest";
import { getCurrentUser } from "@/lib/session";
import { savedSignalIds } from "@/lib/shortlist";
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
};

const GOALS: GrowthGoal[] = ["leads", "revenue", "locations", "hiring", "partnerships"];

export default async function BriefPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;

  // Opportunity-first home: a signed-in user with a saved business profile gets
  // their brief auto-generated — no form to fill in. Query params still override
  // so anyone can run an ad-hoc scenario.
  const user = await getCurrentUser();
  const isConsumer = sp.audience === "consumer";

  // Brand-new signed-in users (no interests and no profile yet) set up first.
  // Consumer mode needs no business profile, so skip the redirect there.
  // redirect() throws by design, so it stays outside any try/catch.
  if (!isConsumer && user && user.subscriptions.length === 0 && !user.businessType) {
    redirect("/onboarding");
  }

  // Resolve business/location/goal (URL or saved profile), build + score the
  // brief and roll it up into lenses. Shared with /summary so the two stay in
  // sync. The lens roll-up is the spine of this page.
  const {
    formBusiness,
    location,
    goal,
    usingGenericDefault,
    fromProfile,
    lensOptions,
    result,
    board,
    lensGroups,
    ctxParams,
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

  // Carry the brief context (audience/business/location/goal) through links.
  const ctxQs = new URLSearchParams(ctxParams).toString();

  // Each lens opens its own dedicated page; "All" stays on the board.
  const lensHref = (k?: string) =>
    k ? `/lens/${k}${ctxQs ? `?${ctxQs}` : ""}` : `/brief${ctxQs ? `?${ctxQs}` : ""}`;
  const lensCount = new Map(lensGroups.map((g) => [g.key, g.count] as const));

  return (
    <div>
      {/* Audience switch — same engine, two lenses on life: business vs. you. */}
      <div className="mb-4 inline-flex rounded-lg border border-white/10 bg-white/[0.03] p-1 text-sm">
        <Link
          href="/brief"
          className={`rounded-md px-3 py-1.5 font-medium transition ${
            isConsumer ? "text-slate-400 hover:text-slate-200" : "bg-brand-500/20 text-brand-100"
          }`}
        >
          For my business
        </Link>
        <Link
          href="/brief?audience=consumer"
          className={`rounded-md px-3 py-1.5 font-medium transition ${
            isConsumer ? "bg-brand-500/20 text-brand-100" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          For me
        </Link>
      </div>

      <header className="mb-5">
        <h1 className="text-2xl font-bold text-white">
          {isConsumer ? "Opportunities for you" : "Opportunity Brief"}
        </h1>
        <p className="text-sm text-slate-400">
          {isConsumer
            ? "Where you can save money, earn more and get ahead — each signal turned into a typical £ value and a recommended action."
            : "Turn live market signals into revenue opportunities — estimated value and a recommended action, tailored to your business and location."}
        </p>
      </header>

      {/* Headline numbers first, so the page opens like a dashboard. */}
      {result && board && (
        <div className="mb-4 flex flex-wrap items-stretch gap-3">
          <Kpi label="Net opportunity" value={formatGBPSigned(board.netOpportunity)} tone={board.netOpportunity >= 0 ? "growth" : "risk"} />
          <Kpi label="Expected value" value={formatGBP(board.expectedGain)} tone="growth" />
          <Kpi label="At risk" value={board.expectedRisk > 0 ? formatGBP(board.expectedRisk) : "£0"} tone="risk" />
          <Kpi
            label="Opportunities"
            value={`${board.count} · ${lensGroups.length} ${lensGroups.length === 1 ? "lens" : "lenses"}`}
            tone="neutral"
          />
          <Link
            href={`/summary${ctxQs ? `?${ctxQs}` : ""}`}
            className="card flex min-w-[150px] flex-1 items-center justify-center gap-1 border-white/10 px-4 py-3 text-sm font-medium text-brand-200 transition hover:border-brand-400/40 hover:text-brand-100"
          >
            Full summary →
          </Link>
        </div>
      )}

      {/* Control panel: the business context that drives the whole brief.
          Consumer mode needs no profile — figures are typical UK benchmarks. */}
      {isConsumer ? (
        <p className="card mb-6 p-3 text-xs text-slate-400">
          Figures are <span className="font-medium text-slate-200">typical UK benchmarks</span> — indicative,
          not personalised. Your actual saving or uplift depends on your current situation.
        </p>
      ) : (
        <form method="get" className="card mb-6 p-4">
          <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1.5fr_1fr_auto]">
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
            <button type="submit" className="btn-primary h-[42px] w-full whitespace-nowrap px-5 lg:w-auto">
              Update
            </button>
          </div>
        </form>
      )}

      {!isConsumer && fromProfile && (
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
          {missedCount > 0 && missedValue > 0 && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-signal-buying/30 bg-signal-buying/10 p-3 text-sm">
              <span className="text-signal-buying">
                You&apos;re not yet acting on{" "}
                <span className="font-bold">{formatGBP(missedValue)}</span> of expected value across{" "}
                <span className="font-bold">{missedCount}</span>{" "}
                {missedCount === 1 ? "opportunity" : "opportunities"}.
              </span>
              <span className="text-xs text-slate-400">Open a lens and save rows to build your portfolio.</span>
            </div>
          )}

          {result.fallback && !usingGenericDefault && (
            <p className="mb-4 rounded-xl border border-signal-buying/30 bg-signal-buying/10 p-3 text-sm text-signal-buying">
              No signals matched that exact profile yet, so we&apos;re showing the strongest current
              signals translated for your business. As local & industry sources are added, this brief
              gets sharper.
            </p>
          )}

          {/* Clickable lens filter — each chip opens that goal lens's own page. */}
          <div className="mb-4 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] uppercase tracking-wide text-slate-500">Jump to a lens:</span>
            {lensOptions.map((l) => {
              if (l.comingSoon) {
                return (
                  <span
                    key={l.key}
                    className="chip cursor-default bg-white/[0.03] text-slate-600"
                    title="Coming soon — we're adding the data source for this lens"
                  >
                    {l.label}
                    <span className="ml-1 rounded bg-white/5 px-1 text-[9px] uppercase tracking-wide text-slate-500">
                      soon
                    </span>
                  </span>
                );
              }
              const count = lensCount.get(l.key) ?? 0;
              if (count === 0) {
                return (
                  <span
                    key={l.key}
                    className="chip cursor-default bg-white/[0.03] text-slate-600"
                    title="No live opportunities in this lens right now"
                  >
                    {l.label}
                  </span>
                );
              }
              return (
                <Link
                  key={l.key}
                  href={lensHref(l.key)}
                  className="chip bg-white/5 text-slate-300 transition hover:bg-white/10"
                >
                  {l.label}
                  <span className="ml-1 text-[10px] text-slate-500">{count}</span>
                </Link>
              );
            })}
          </div>

          {lensGroups.length === 0 ? (
            <p className="text-sm text-slate-400">No opportunities available.</p>
          ) : (
            <LensBoard groups={lensGroups} base={ctxParams} />
          )}

          <p className="mt-6 text-xs text-slate-600">
            {isConsumer
              ? "Each lens groups opportunities by what you're trying to improve, sized by typical value. Open one to see the opportunities and a step-by-step action plan. Figures are indicative UK benchmarks, not guarantees."
              : "Each lens is a revenue bucket for your business, sized by expected value. Open one to see its opportunities and a combined action plan. Revenue figures are estimates based on public UK benchmarks and conservative capture-rate assumptions; they are indicative, not guarantees."}
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
        <span className="text-slate-200">Catford</span>, then Update. Each signal is translated into a
        revenue opportunity for your business — e.g.{" "}
        <span className="text-slate-200">
          &quot;600 new homes → 40–110 new patients → {`${"£"}`}7k–70k/yr → run a mail campaign.&quot;
        </span>
      </p>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-white/10 bg-ink-900/70 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-brand-500 focus:outline-none [&>option]:bg-ink-900 [&>option]:text-white";
