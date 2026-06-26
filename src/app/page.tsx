import Link from "next/link";
import { DemandCard } from "@/components/DemandCard";
import { getDashboardSummary, getDemandIdeas } from "@/lib/demand";

export const dynamic = "force-dynamic";

export default async function Home() {
  let topIdeas: Awaited<ReturnType<typeof getDemandIdeas>> = [];
  let summary = { totalVotes: 0, totalIdeas: 0 };

  try {
    [topIdeas, summary] = await Promise.all([
      getDemandIdeas({ sort: "score", limit: 6 }),
      getDashboardSummary(),
    ]);
  } catch {
    // DB may not be seeded yet
  }

  return (
    <div className="space-y-24">
      {/* Hero */}
      <section className="pt-12">
        <div className="text-center">
          <span className="chip mx-auto border border-white/10 bg-white/5 text-slate-300">
            Customer Demand Intelligence
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-bold leading-tight text-white sm:text-6xl">
            Vote products &amp; services <span className="text-brand-400">into existence.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-400">
            Tell businesses what you actually want — before they build the wrong thing. Your votes create real demand
            intelligence that shapes the marketplace.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/ideas" className="btn-primary px-6 py-3 text-base">
              Browse &amp; vote
            </Link>
            <Link href="/need" className="btn-ghost px-6 py-3 text-base">
              Get help now
            </Link>
            <Link href="/submit" className="btn-ghost px-6 py-3 text-base">
              Submit an idea
            </Link>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <HeroStat label="Demand ideas tracked" value={String(summary.totalIdeas || "24+")} />
          <HeroStat label="Customer votes cast" value={(summary.totalVotes || 8400).toLocaleString()} tone="growth" />
          <HeroStat label="Businesses using insights" value="150+" />
        </div>
      </section>

      {/* Live demand feed preview */}
      {topIdeas.length > 0 && (
        <section>
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white">What people want right now</h2>
              <p className="mt-1 text-sm text-slate-400">Vote for the services you wish existed in your area.</p>
            </div>
            <Link href="/ideas" className="btn-ghost shrink-0 px-4 py-2 text-sm">
              See all →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {topIdeas.slice(0, 6).map((idea) => (
              <DemandCard
                key={idea.id}
                id={idea.id}
                title={idea.title}
                description={idea.description}
                category={idea.category}
                location={idea.location}
                stats={idea.stats}
              />
            ))}
          </div>
        </section>
      )}

      {/* How voting works */}
      <section>
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-white">More than a like button</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-400">
            Every vote type carries a different weight. Businesses see a real Demand Score — not just popularity.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { emoji: "👍", label: "Want this", weight: "×1" },
            { emoji: "🔥", label: "Need this", weight: "×2" },
            { emoji: "📍", label: "In my area", weight: "×3" },
            { emoji: "💰", label: "Would pay", weight: "×5" },
            { emoji: "✅", label: "Join waitlist", weight: "×10" },
          ].map((v) => (
            <div key={v.label} className="card p-4 text-center">
              <div className="text-2xl">{v.emoji}</div>
              <div className="mt-2 text-sm font-semibold text-white">{v.label}</div>
              <div className="mt-1 text-xs text-brand-300">{v.weight} demand weight</div>
            </div>
          ))}
        </div>
      </section>

      {/* Two audiences */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="card p-7">
          <h3 className="text-xl font-bold text-white">For Consumers</h3>
          <p className="mt-1 text-sm text-slate-400">Shape the future marketplace. Get what you actually want.</p>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            {[
              "Vote for services you wish existed",
              "Submit your own ideas",
              "See how many others agree",
              "Join waitlists for upcoming launches",
            ].map((x) => (
              <li key={x} className="flex items-start gap-2 rounded-lg bg-white/5 px-3 py-2">
                <span className="text-brand-400">→</span> {x}
              </li>
            ))}
          </ul>
          <Link href="/ideas" className="btn-primary mt-5 px-5 py-2">
            Start voting
          </Link>
        </div>
        <div className="card border-brand-400/20 p-7 shadow-glow">
          <h3 className="text-xl font-bold text-white">For Businesses</h3>
          <p className="mt-1 text-sm text-slate-400">
            Know what customers want before you invest time and money building it.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            {[
              "Demand intelligence dashboard",
              "Demographics & geography",
              "Pricing & urgency insights",
              "Trending & unserved demand alerts",
            ].map((x) => (
              <li key={x} className="flex items-start gap-2 rounded-lg bg-white/5 px-3 py-2">
                <span className="text-brand-400">→</span> {x}
              </li>
            ))}
          </ul>
          <Link href="/dashboard" className="btn-primary mt-5 px-5 py-2">
            View dashboard
          </Link>
        </div>
      </section>

      {/* The transformation */}
      <section className="grid grid-cols-1 items-center gap-6 md:grid-cols-2">
        <div className="card border-white/5 bg-ink-800/50 p-6">
          <div className="text-xs uppercase tracking-wide text-slate-500">Traditional market research</div>
          <p className="mt-3 text-lg text-slate-400">
            &ldquo;We surveyed 200 people and 34% said they might be interested.&rdquo;
          </p>
          <ul className="mt-4 space-y-1 text-sm text-slate-500">
            <li>• Expensive (£5k–£50k per study)</li>
            <li>• Slow (weeks to months)</li>
            <li>• Small, biased samples</li>
          </ul>
        </div>
        <div className="card p-6 shadow-glow">
          <div className="text-xs uppercase tracking-wide text-brand-300">SignalsForMe demand intelligence</div>
          <p className="mt-3 text-lg font-semibold text-white">
            &ldquo;4,500 people would pay £20/month for mobile car wash at home.&rdquo;
          </p>
          <div className="mt-3 text-2xl font-bold text-signal-growth">Demand Score: 8,750 — Very High</div>
          <ul className="mt-3 space-y-1 text-sm text-slate-300">
            <li>• London: 9,400 · Manchester: 2,200</li>
            <li>• Age 25–45, parents, £60k+ income</li>
            <li>• 63% demand growth in 7 days</li>
          </ul>
          <div className="mt-3 rounded-lg border border-brand-400/20 bg-brand-500/5 px-3 py-2 text-sm text-brand-200">
            Launch here first. These customers are waiting.
          </div>
        </div>
      </section>

      {/* How it works */}
      <section>
        <h2 className="text-center text-2xl font-bold text-white">From wish to validated demand in four steps</h2>
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-4">
          {[
            { n: "01", t: "Discover", d: "Browse ideas or submit what you wish existed — dental after hours, mobile car wash, weekend childcare." },
            { n: "02", t: "Vote", d: "Like, need, would pay, or join the waitlist. Add pricing and urgency so businesses know it's real." },
            { n: "03", t: "Aggregate", d: "Votes become a Demand Score with geography, demographics, and growth trends." },
            { n: "04", t: "Launch", d: "Businesses see validated demand and know exactly what to build, where, and at what price." },
          ].map((s) => (
            <div key={s.n} className="card p-5">
              <div className="text-sm font-bold text-brand-400">{s.n}</div>
              <div className="mt-1 text-lg font-semibold text-white">{s.t}</div>
              <p className="mt-1 text-sm text-slate-400">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Differentiator */}
      <section className="card p-8 text-center">
        <h2 className="text-2xl font-bold text-white">The Bloomberg Terminal for Customer Demand</h2>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Surveys", "What did we ask?"],
            ["Social media", "What are people saying?"],
            ["Google Trends", "What are people searching?"],
            ["SignalsForMe", "What will people actually pay for?"],
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
        <h2 className="text-3xl font-bold text-white">Tell businesses what you want.</h2>
        <p className="mx-auto mt-3 max-w-xl text-slate-400">
          The world&apos;s largest customer demand intelligence platform — before anyone builds it.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/ideas" className="btn-primary px-8 py-3 text-base">
            Vote now
          </Link>
          <Link href="/pricing" className="btn-ghost px-8 py-3 text-base">
            Business plans
          </Link>
        </div>
      </section>
    </div>
  );
}

function HeroStat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "growth" | "neutral";
}) {
  const color = tone === "growth" ? "text-signal-growth" : "text-white";
  return (
    <div className="card p-6 text-center">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-2 text-3xl font-bold sm:text-4xl ${color}`}>{value}</div>
    </div>
  );
}
