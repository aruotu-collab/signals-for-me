import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { type BriefRow } from "@/lib/brief";
import { resolveBrief } from "@/lib/briefRequest";
import { getCurrentUser } from "@/lib/session";
import { OpportunityTable } from "@/components/OpportunityTable";
import { OpportunityCard } from "@/components/OpportunityCard";
import { formatGBP, formatGBPSigned } from "@/lib/opportunity";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Opportunity lens",
  robots: { index: false, follow: false },
};

type SP = {
  business?: string;
  location?: string;
  goal?: string;
  audience?: string;
  view?: string;
  sort?: string;
  urg?: string;
  min?: string;
};

const SORTS = ["expected", "roi", "value", "confidence", "urgency", "recent"] as const;
type Sort = (typeof SORTS)[number];
const URGENCY_RANK: Record<string, number> = { high: 3, medium: 2, low: 1 };

export default async function LensPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<SP>;
}) {
  const { key } = await params;
  const sp = await searchParams;
  const user = await getCurrentUser();

  if (user && user.subscriptions.length === 0 && !user.businessType) {
    redirect("/onboarding");
  }

  const { business, location, goal, btLabel, lensKeys, result, lensGroups } = await resolveBrief(sp, user, {
    limit: 12,
  });

  // Carry the business context through every link + the refine form.
  const ctxParams: Record<string, string> = {};
  if (business) ctxParams.business = business;
  if (location) ctxParams.location = location;
  if (goal) ctxParams.goal = goal;
  const ctxQs = new URLSearchParams(ctxParams).toString();
  const boardHref = `/brief${ctxQs ? `?${ctxQs}` : ""}`;

  const group = lensGroups.find((g) => g.key === key) ?? null;
  const validKey = lensKeys.includes(key);

  // Nothing to show: either the lens isn't valid for this business, or it has no
  // live opportunities right now. Send the user back to the board.
  if (!result || !group) {
    return (
      <div>
        <Link href={boardHref} className="text-sm text-brand-300 hover:text-brand-200 hover:underline">
          ← All lenses
        </Link>
        <div className="card mt-4 p-6 text-sm text-slate-300">
          <p className="font-medium text-white">
            {validKey ? "No live opportunities in this lens right now." : "Unknown lens."}
          </p>
          <p className="mt-1 text-slate-400">
            Head back to your{" "}
            <Link href={boardHref} className="text-brand-300 underline hover:text-white">
              opportunity lenses
            </Link>{" "}
            to pick another.
          </p>
        </div>
      </div>
    );
  }

  const layout = sp.view === "cards" ? "cards" : "table";
  const sort: Sort = (SORTS as readonly string[]).includes(sp.sort ?? "") ? (sp.sort as Sort) : "expected";
  const urgFilter = ["high", "medium", "low"].includes(sp.urg ?? "") ? (sp.urg as string) : undefined;
  const minValue = Number(sp.min) > 0 ? Number(sp.min) : 0;

  let displayed: BriefRow[] = result.rows.filter((r) => r.opportunity.lensKey === key);
  if (urgFilter) displayed = displayed.filter((r) => r.opportunity.urgency === urgFilter);
  if (minValue) {
    displayed = displayed.filter((r) => Math.max(r.opportunity.valueHigh, r.opportunity.riskHigh) >= minValue);
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

  // Combined "play": distinct action steps across the lens, capped to a checklist.
  const lensPlan: string[] = [];
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
  const lensPlanTop = lensPlan.slice(0, 5);

  const lensHref = (k: string) => `/lens/${k}${ctxQs ? `?${ctxQs}` : ""}`;

  // This page's own URL (context + active filters) so a signal page can send the
  // user straight back to exactly this lens view.
  const selfParams = new URLSearchParams(ctxParams);
  if (sort !== "expected") selfParams.set("sort", sort);
  if (layout !== "table") selfParams.set("view", layout);
  if (urgFilter) selfParams.set("urg", urgFilter);
  if (minValue) selfParams.set("min", String(minValue));
  const selfHref = `/lens/${key}${selfParams.toString() ? `?${selfParams.toString()}` : ""}`;

  return (
    <div>
      <Link href={boardHref} className="text-sm text-brand-300 hover:text-brand-200 hover:underline">
        ← All lenses
      </Link>

      {/* Quick switch between the business's other lenses without going back. */}
      {lensGroups.length > 1 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {lensGroups.map((g) => {
            const active = g.key === key;
            return (
              <Link
                key={g.key}
                href={lensHref(g.key)}
                className={`chip transition ${
                  active
                    ? "bg-brand-500/20 text-brand-100 ring-1 ring-brand-400/40"
                    : "bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
              >
                {g.label}
                <span className={`ml-1 text-[10px] ${active ? "text-brand-200" : "text-slate-500"}`}>{g.count}</span>
              </Link>
            );
          })}
        </div>
      )}

      {/* Lens detail: totals + a combined play. */}
      <header className="card mt-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-white">{group.label}</h1>
              {group.defensive && <span className="chip bg-signal-distress/15 text-signal-distress">defend</span>}
              {group.urgentCount > 0 && (
                <span className="chip bg-signal-buying/15 text-signal-buying">{group.urgentCount} urgent</span>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-400">
              <span className={group.defensive ? "font-semibold text-signal-distress" : "font-semibold text-signal-growth"}>
                {formatGBPSigned(group.expectedValue)}
              </span>{" "}
              expected value · {group.count} {group.count === 1 ? "opportunity" : "opportunities"}
              {group.topRoi > 0 ? ` · up to ${group.topRoi}x ROI` : ""} · {btLabel}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/shortlist" className="btn-ghost whitespace-nowrap text-xs">
              Portfolio
            </Link>
            <Link href={`/areas?business=${encodeURIComponent(business)}`} className="btn-ghost whitespace-nowrap text-xs">
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
      </header>

      {/* Refine controls scoped to this lens. */}
      <form method="get" className="mt-4 flex flex-wrap items-end gap-2">
        <input type="hidden" name="business" value={business} />
        {location && <input type="hidden" name="location" value={location} />}
        {goal && <input type="hidden" name="goal" value={goal} />}
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
        <Mini label="View">
          <select name="view" defaultValue={layout} className={miniCls}>
            <option value="table">Table</option>
            <option value="cards">Cards</option>
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
        <button type="submit" className="btn-ghost h-[38px] whitespace-nowrap px-4 text-sm">
          Apply
        </button>
      </form>

      <div className="mb-3 mt-5 flex items-end justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Opportunities in this lens
        </h2>
        <span className="text-xs text-slate-500">
          {displayed.length} shown · tick rows to compare
        </span>
      </div>

      {displayed.length === 0 ? (
        <p className="text-sm text-slate-400">No opportunities match these filters.</p>
      ) : layout === "table" ? (
        <OpportunityTable items={displayed} compareBase={ctxParams} from={selfHref} />
      ) : (
        <div className="space-y-4">
          {displayed.map((row) => (
            <OpportunityCard key={row.signal.id} row={row} from={selfHref} />
          ))}
        </div>
      )}

      <p className="mt-6 text-xs text-slate-600">
        Revenue figures are estimates based on public UK benchmarks (ONS household size, sector fee/value
        averages) and conservative capture-rate assumptions shown on each card or row. They are indicative,
        not guarantees.
      </p>
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
