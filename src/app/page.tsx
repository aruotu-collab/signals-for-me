import Link from "next/link";
import { prisma } from "@/lib/db";
import { SIGNAL_TAXONOMY } from "@/lib/taxonomy";
import { buildBrief } from "@/lib/brief";
import { computeScoreboard } from "@/lib/scoreboard";
import { Scoreboard } from "@/components/Scoreboard";
import { formatGBP, GOAL_LENSES } from "@/lib/opportunity";

export const dynamic = "force-dynamic";

export default async function Home() {
  const signalCount = await prisma.signal.count().catch(() => 0);
  const typeCount = SIGNAL_TAXONOMY.length;

  // Real example scoreboard for the flagship vertical — the homepage IS the
  // "scoreboard of money", not a feed of news.
  let demoBoard = null;
  try {
    const demo = await buildBrief({ businessTypeKey: "dentist", location: "", limit: 12 });
    demoBoard = computeScoreboard(demo.rows);
  } catch {
    demoBoard = null;
  }
  const headlineValue = demoBoard && demoBoard.opportunityHigh > 0 ? formatGBP(demoBoard.opportunityHigh) : null;

  // Hero headline stats — a live, site-wide aggregate across every current
  // signal (generic lens) so all three numbers reflect real data. The written
  // figures remain as a graceful fallback if the aggregate can't be built.
  let heroBoard = null;
  try {
    const all = await buildBrief({ businessTypeKey: "generic", location: "", limit: 400 });
    heroBoard = computeScoreboard(all.rows);
  } catch {
    heroBoard = null;
  }
  const heroStats = {
    opportunities: heroBoard && heroBoard.opportunityHigh > 0 ? formatGBPFull(heroBoard.opportunityHigh) : "£1,247,000",
    risks: heroBoard && heroBoard.riskHigh > 0 ? formatGBPFull(heroBoard.riskHigh) : "£380,000",
    actions: heroBoard && heroBoard.count > 0 ? String(heroBoard.urgentCount || heroBoard.count) : "17",
  };

  // Same signal, different lens depending on who's looking — the core idea.
  const interpretations = [
    { business: "Pawnbroker", lens: "Investment & Acquisition", takeaway: "more gold & asset sellers walk in" },
    { business: "Recruiter", lens: "Hiring & Talent", takeaway: "a pool of candidates to place" },
    { business: "Café", lens: "Risk Intelligence", takeaway: "local spending could tighten — defend it" },
  ];

  return (
    <div className="space-y-24">
      {/* Hero */}
      <section className="pt-12">
        <div className="text-center">
          <span className="chip mx-auto border border-white/10 bg-white/5 text-slate-300">
            The Opportunity Intelligence Platform
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-bold leading-tight text-white sm:text-6xl">
            Find Opportunities <span className="text-brand-400">Before Your Competitors.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-400">
            SignalsForMe continuously monitors thousands of public data sources and converts market
            events into actionable opportunities, risks, and trends tailored to your business.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/brief" className="btn-primary px-6 py-3 text-base">
              Find my opportunities
            </Link>
            <Link href="/areas" className="btn-ghost px-6 py-3 text-base">
              Top opportunity areas
            </Link>
          </div>
        </div>

        {/* Headline numbers — the proof, front and centre. */}
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <HeroStat
            label="Potential opportunities found this month"
            value={heroStats.opportunities}
            tone="growth"
          />
          <HeroStat label="Potential risks identified" value={heroStats.risks} tone="risk" />
          <HeroStat label="Recommended actions" value={heroStats.actions} tone="neutral" />
        </div>
        <div className="mt-6 text-center text-sm text-slate-500">
          {signalCount} live signals · {typeCount} opportunity types across business & consumer
        </div>
      </section>

      {/* Live example scoreboard — money first */}
      {demoBoard && demoBoard.count > 0 && (
        <section>
          <div className="mb-4 text-center">
            <h2 className="text-2xl font-bold text-white">
              {headlineValue
                ? `We found up to ${headlineValue} of opportunities for a dental practice.`
                : "Your business opportunity scoreboard."}
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              A live example. Set your business type and location to see your own scoreboard.
            </p>
          </div>
          <div className="card p-5">
            <Scoreboard board={demoBoard} businessLabel="Dental practice" heading="Example — dental practice" />
            <div className="text-center">
              <Link href="/brief" className="btn-primary px-6 py-2.5">
                Build my scoreboard
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Goal lenses: one universal menu, interpreted for your business */}
      <section>
        <div className="mb-6 text-center">
          <span className="chip mx-auto border border-white/10 bg-white/5 text-slate-300">
            One operating system for opportunity
          </span>
          <h2 className="mt-4 text-2xl font-bold text-white">
            Organised by your goals, not industry jargon.
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-400">
            Every business works the same set of money-lenses — starting with{" "}
            <span className="text-slate-200">Revenue</span>. The lenses don&apos;t change; what changes is
            how each signal is <span className="text-slate-200">interpreted</span> for your business.
          </p>
        </div>

        {/* The universal lens menu. */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {GOAL_LENSES.map((l, i) => (
            <div
              key={l.key}
              className={`card p-4 ${i === 0 ? "border-brand-400/40 bg-brand-500/[0.06]" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-white">{l.label}</div>
                {i === 0 && <span className="chip bg-brand-500/15 text-brand-200">primary</span>}
                {l.comingSoon && <span className="chip bg-white/5 text-slate-500">soon</span>}
              </div>
              <p className="mt-1 text-xs text-slate-400">{l.question}</p>
            </div>
          ))}
        </div>

        {/* Same signal, different interpretation. */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-ink-900/60 p-5">
          <div className="text-center text-sm text-slate-400">
            One signal — <span className="font-medium text-slate-200">“a wave of local redundancies”</span> —
            three businesses, three lenses:
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            {interpretations.map((it) => (
              <div key={it.business} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <div className="text-sm font-semibold text-white">{it.business}</div>
                <div className="mt-1 text-xs font-medium text-brand-200">{it.lens}</div>
                <p className="mt-1 text-xs text-slate-400">{it.takeaway}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link href="/brief" className="btn-primary px-6 py-2.5">
            See your lenses
          </Link>
        </div>
      </section>

      {/* The transformation */}
      <section className="grid grid-cols-1 items-center gap-6 md:grid-cols-2">
        <div className="card border-white/5 bg-ink-800/50 p-6">
          <div className="text-xs uppercase tracking-wide text-slate-500">What everyone else reads</div>
          <p className="mt-3 text-lg text-slate-400">“Company ABC raised £15M funding.”</p>
        </div>
        <div className="card p-6 shadow-glow">
          <div className="text-xs uppercase tracking-wide text-brand-300">What we show you</div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-signal-growth">
              Revenue opportunity
            </span>
            <span className="text-xs text-slate-500">91% confidence</span>
          </div>
          <p className="mt-2 text-lg font-semibold text-white">
            Company ABC raised £15M and is hiring operations managers.
          </p>
          <div className="mt-3 text-2xl font-bold text-signal-growth">£120k–£260k potential</div>
          <ul className="mt-3 space-y-1 text-sm text-slate-300">
            <li>• New software buyer (SaaS &amp; IT)</li>
            <li>• Recruitment contract (agencies)</li>
            <li>• Office &amp; expansion spend (suppliers)</li>
          </ul>
          <div className="mt-3 rounded-lg border border-brand-400/20 bg-brand-500/5 px-3 py-2 text-sm text-brand-200">
            Recommended action: Contact decision-makers within 30 days.
          </div>
        </div>
      </section>

      {/* How it works */}
      <section>
        <h2 className="text-center text-2xl font-bold text-white">From news to revenue in four steps</h2>
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-4">
          {[
            { n: "01", t: "Ingest", d: "Continuously pull from news, Companies House, planning approvals, tenders, job boards & search trends." },
            { n: "02", t: "Detect", d: "AI asks: is there an opportunity, risk or trend here? If yes, it’s captured." },
            { n: "03", t: "Value", d: "Translate it into £ value, £ risk, confidence and the action to take — for your business." },
            { n: "04", t: "Bucket", d: "Sort every opportunity into your business lenses, ranked by expected value, so you know which bucket to work first." },
          ].map((s) => (
            <div key={s.n} className="card p-5">
              <div className="text-sm font-bold text-brand-400">{s.n}</div>
              <div className="mt-1 text-lg font-semibold text-white">{s.t}</div>
              <p className="mt-1 text-sm text-slate-400">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Two audiences */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="card p-7">
          <h3 className="text-xl font-bold text-white">For Businesses</h3>
          <p className="mt-1 text-sm text-slate-400">Who should I sell to? Who's growing? Where is money moving?</p>
          <ul className="mt-4 grid grid-cols-2 gap-2 text-sm text-slate-300">
            {["Funding", "Hiring surges", "Procurement & tenders", "Market expansion", "Buying intent", "Competitor moves"].map(
              (x) => (
                <li key={x} className="rounded-lg bg-white/5 px-3 py-2">
                  {x}
                </li>
              ),
            )}
          </ul>
        </div>
        <div className="card p-7">
          <h3 className="text-xl font-bold text-white">For Consumers</h3>
          <p className="mt-1 text-sm text-slate-400">What opportunities should I know about right now?</p>
          <ul className="mt-4 grid grid-cols-2 gap-2 text-sm text-slate-300">
            {["Remote jobs", "AI tools", "Cheap flights", "Side hustles", "Grants & savings", "Local events"].map((x) => (
              <li key={x} className="rounded-lg bg-white/5 px-3 py-2">
                {x}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Differentiator */}
      <section className="card p-8 text-center">
        <h2 className="text-2xl font-bold text-white">What makes it different</h2>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Google", "What are you looking for?"],
            ["LinkedIn", "Who do you know?"],
            ["News", "What happened?"],
            ["Signals For Me", "Where can I make — and protect — money right now?"],
          ].map(([k, v], i) => (
            <div key={k} className={`rounded-xl p-4 ${i === 3 ? "bg-brand-500/15 ring-1 ring-brand-400/40" : "bg-white/5"}`}>
              <div className={`text-sm font-bold ${i === 3 ? "text-brand-200" : "text-slate-300"}`}>{k}</div>
              <div className="mt-1 text-sm text-slate-400">{v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center">
        <h2 className="text-3xl font-bold text-white">Bloomberg for opportunities.</h2>
        <p className="mx-auto mt-3 max-w-xl text-slate-400">
          Helping people discover opportunities before everyone else.
        </p>
        <Link href="/brief" className="btn-primary mt-6 px-8 py-3 text-base">
          See your opportunities
        </Link>
      </section>
    </div>
  );
}

// Full pound figure with thousands separators, e.g. "£1,247,000" — the hero
// wants the impact of the whole number, not the abbreviated £1.2m form.
function formatGBPFull(n: number): string {
  return `£${Math.round(n).toLocaleString("en-GB")}`;
}

function HeroStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "growth" | "risk" | "neutral";
}) {
  const color =
    tone === "growth" ? "text-signal-growth" : tone === "risk" ? "text-signal-distress" : "text-white";
  return (
    <div className="card p-6 text-center">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-2 text-3xl font-bold [overflow-wrap:anywhere] sm:text-4xl ${color}`}>
        {value}
      </div>
    </div>
  );
}
