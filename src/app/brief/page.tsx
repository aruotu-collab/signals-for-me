import type { Metadata } from "next";
import Link from "next/link";
import { buildBrief, type BriefRow, type Rating } from "@/lib/brief";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Business Brief",
  description:
    "Enter your industry and location to get an opportunity, risk, trend and profit-move brief built from live signals.",
};

type SP = { industry?: string; location?: string; audience?: string };

export default async function BriefPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const industry = (sp.industry ?? "").trim();
  const location = (sp.location ?? "").trim();
  const audience = sp.audience === "consumer" ? "consumer" : sp.audience === "business" ? "business" : undefined;
  const hasQuery = industry.length > 0 || location.length > 0;

  const result = hasQuery
    ? await buildBrief({ industry, location, audience, limit: 12 })
    : null;

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">Business Brief</h1>
        <p className="text-sm text-slate-400">
          Tell us your business and where you operate. We turn live signals into opportunities,
          risks, trends and profit moves — tailored to you.
        </p>
      </header>

      <form method="get" className="card mb-8 grid gap-3 p-5 sm:grid-cols-[1.4fr_1fr_auto_auto] sm:items-end">
        <Field label="Your business / industry">
          <input
            name="industry"
            defaultValue={industry}
            placeholder="e.g. dental practice"
            className={inputCls}
          />
        </Field>
        <Field label="Location">
          <input
            name="location"
            defaultValue={location}
            placeholder="e.g. Catford, SE6"
            className={inputCls}
          />
        </Field>
        <Field label="Audience">
          <select name="audience" defaultValue={audience ?? ""} className={inputCls}>
            <option value="">Any</option>
            <option value="business">Business</option>
            <option value="consumer">Consumer</option>
          </select>
        </Field>
        <button type="submit" className="btn-primary h-[42px] whitespace-nowrap">
          Build brief
        </button>
      </form>

      {!result && <EmptyState />}

      {result && (
        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-white">
              {industry || "Your business"}
              {location ? <span className="text-slate-400"> · {location}</span> : null}
            </h2>
            <span className="text-xs text-slate-500">{result.rows.length} signals</span>
          </div>

          {result.fallback && (
            <p className="mb-4 rounded-xl border border-signal-buying/30 bg-signal-buying/10 p-3 text-sm text-signal-buying">
              No signals matched that exact profile yet, so we&apos;re showing the strongest current
              signals. As local and industry sources are added, this brief gets sharper.
            </p>
          )}

          {result.rows.length === 0 ? (
            <p className="text-sm text-slate-400">No signals available.</p>
          ) : (
            <div className="space-y-4">
              {result.rows.map((row) => (
                <BriefCard key={row.signal.id} row={row} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function BriefCard({ row }: { row: BriefRow }) {
  const { signal } = row;
  return (
    <article className="card p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={`/signals/${signal.id}`} className="text-base font-semibold text-white hover:underline">
            {signal.title}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="chip bg-white/5 text-slate-300">{row.trend}</span>
            {row.locationMatch && (
              <span className="chip bg-signal-government/15 text-signal-government">local match</span>
            )}
            {row.industryMatch && (
              <span className="chip bg-signal-hiring/15 text-signal-hiring">industry match</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Cell label="Opportunity" tone="opportunity">
          {row.opportunity ? (
            <>
              <RatingBadge rating={row.opportunity.rating} />
              <p className="mt-1 break-words">{row.opportunity.title}</p>
            </>
          ) : (
            <p className="text-slate-500">—</p>
          )}
        </Cell>
        <Cell label="Risk" tone="risk">
          {row.risk ? (
            <>
              <RatingBadge rating={row.risk.rating} />
              <p className="mt-1 break-words">{row.risk.title}</p>
            </>
          ) : (
            <p className="text-slate-500">—</p>
          )}
        </Cell>
        <Cell label="Profit move" tone="profit">
          <p className="break-words">{row.profitMove ?? "—"}</p>
        </Cell>
      </div>
    </article>
  );
}

function Cell({
  label,
  tone,
  children,
}: {
  label: string;
  tone: "opportunity" | "risk" | "profit";
  children: React.ReactNode;
}) {
  const border =
    tone === "opportunity"
      ? "border-signal-growth/30"
      : tone === "risk"
        ? "border-signal-distress/30"
        : "border-signal-hiring/30";
  return (
    <div className={`rounded-xl border ${border} bg-white/[0.02] p-3`}>
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="text-sm text-slate-200">{children}</div>
    </div>
  );
}

function RatingBadge({ rating }: { rating: Rating }) {
  const cls =
    rating === "High"
      ? "bg-signal-growth/15 text-signal-growth"
      : rating === "Medium"
        ? "bg-signal-buying/15 text-signal-buying"
        : "bg-white/5 text-slate-400";
  return <span className={`chip ${cls}`}>{rating}</span>;
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
        Enter something like <span className="text-slate-200">&quot;dental practice&quot;</span> in
        Business and <span className="text-slate-200">&quot;Catford&quot;</span> in Location, then
        Build brief. You&apos;ll get a matrix of opportunities, risks, trends and profit moves drawn
        from current signals.
      </p>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-white/10 bg-ink-900/70 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-brand-500 focus:outline-none";
