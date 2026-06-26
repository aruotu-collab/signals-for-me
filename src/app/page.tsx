import Link from "next/link";
import { DemandCard } from "@/components/DemandCard";
import { NeedHubRequest } from "@/components/NeedHubRequest";
import { getDashboardSummary, getDemandIdeas } from "@/lib/demand";
import { EMERGENCY_QUICK_PICKS } from "@/lib/serviceRequest";
import { countPublishedCampaigns, listPublishedCampaigns } from "@/lib/intent/queries";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  let topIdeas: Awaited<ReturnType<typeof getDemandIdeas>> = [];
  let summary = { totalVotes: 0, totalIdeas: 0 };
  let serviceCount = 0;
  let requestCount = 0;
  let featuredServices: Awaited<ReturnType<typeof listPublishedCampaigns>> = [];

  try {
    [topIdeas, summary, serviceCount, requestCount, featuredServices] = await Promise.all([
      getDemandIdeas({ sort: "score", limit: 3 }),
      getDashboardSummary(),
      countPublishedCampaigns(),
      prisma.serviceRequest.count(),
      listPublishedCampaigns({ intentGroup: "emergency", limit: 6 }),
    ]);
  } catch {
    // DB may not be seeded yet
  }

  if (featuredServices.length < 4) {
    try {
      const more = await listPublishedCampaigns({ limit: 6 });
      featuredServices = more;
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-20">
      {/* Hero — need / intent first */}
      <section className="pt-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-start">
          <div>
            <span className="chip border border-brand-400/30 bg-brand-500/10 text-brand-200">
              Need help right now?
            </span>
            <h1 className="mt-4 text-4xl font-bold leading-tight text-white sm:text-5xl">
              Flat tire, locked out, burst pipe — <span className="text-brand-400">get connected.</span>
            </h1>
            <p className="mt-4 text-lg text-slate-400">
              Tell us what you need and where you are. We match you with local providers — then show you who to call.
              No account required.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {EMERGENCY_QUICK_PICKS.slice(0, 6).map((p) => (
                <Link
                  key={p.label}
                  href={`/need?q=${encodeURIComponent(p.query)}`}
                  className="chip bg-white/5 text-slate-300 hover:bg-brand-500/15 hover:text-brand-200"
                >
                  {p.label}
                </Link>
              ))}
            </div>
            <div className="mt-8 grid grid-cols-3 gap-3">
              <HeroStat label="Services live" value={serviceCount > 0 ? serviceCount.toLocaleString() : "1,000+"} />
              <HeroStat label="Help requests" value={requestCount.toLocaleString()} tone="growth" />
              <HeroStat label="Demand votes" value={(summary.totalVotes || 0).toLocaleString()} />
            </div>
          </div>

          <div id="request">
            <NeedHubRequest />
          </div>
        </div>
      </section>

      {/* Featured intent pages */}
      {featuredServices.length > 0 && (
        <section>
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white">Popular urgent services</h2>
              <p className="mt-1 text-sm text-slate-400">
                High-intent pages — search Google, land here, request help, get connected.
              </p>
            </div>
            <Link href="/need" className="btn-ghost shrink-0 px-4 py-2 text-sm">
              All services →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {featuredServices.slice(0, 6).map((c) => (
              <Link
                key={c.id}
                href={`/need/${c.slug}`}
                className="card block p-5 transition hover:border-brand-400/30"
              >
                <div className="text-xs text-slate-500">{c.modifierLabel}</div>
                <div className="mt-1 font-semibold text-white">{c.h1}</div>
                <p className="mt-2 line-clamp-2 text-sm text-slate-400">{c.howFast}</p>
                <span className="mt-3 inline-block text-sm text-brand-300">Request help →</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* How it works — intent flow */}
      <section>
        <h2 className="text-center text-2xl font-bold text-white">From Google search to help in minutes</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-slate-400">
          Built for people who need a solution immediately — not another directory to browse.
        </p>
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-4">
          {[
            { n: "01", t: "Search", d: "You Google \"flat tire repair near me\" and land on our page." },
            { n: "02", t: "Request", d: "Fill a short form — service, location, urgency, and your phone." },
            { n: "03", t: "Connect", d: "We show a number to call a local provider in your area." },
            { n: "04", t: "Intelligence", d: "Every request feeds demand data — what people need, where, and when." },
          ].map((s) => (
            <div key={s.n} className="card p-5">
              <div className="text-sm font-bold text-brand-400">{s.n}</div>
              <div className="mt-1 text-lg font-semibold text-white">{s.t}</div>
              <p className="mt-1 text-sm text-slate-400">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Dual platform */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="card border-brand-400/20 p-7 shadow-glow">
          <span className="chip bg-brand-500/15 text-brand-200">Intent Network</span>
          <h3 className="mt-3 text-xl font-bold text-white">Need something now?</h3>
          <p className="mt-1 text-sm text-slate-400">
            Urgent help — plumbers, locksmiths, tow trucks, and hundreds more. Request first, call second.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            {[
              "1,000+ service pages for Google search",
              "Request form with location & urgency",
              "Phone connection after you submit",
              "No sign-in required",
            ].map((x) => (
              <li key={x} className="flex items-start gap-2 rounded-lg bg-white/5 px-3 py-2">
                <span className="text-brand-400">→</span> {x}
              </li>
            ))}
          </ul>
          <Link href="/need" className="btn-primary mt-5 px-5 py-2">
            Get help now
          </Link>
        </div>
        <div className="card p-7">
          <span className="chip border border-white/10 bg-white/5 text-slate-300">Demand Intelligence</span>
          <h3 className="mt-3 text-xl font-bold text-white">Shape what gets built</h3>
          <p className="mt-1 text-sm text-slate-400">
            Not urgent? Vote on ideas for products and services you wish existed in your area.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            {[
              "Vote: want, need, would pay, waitlist",
              "Submit your own ideas",
              "See demand scores by location",
              "Businesses use this to decide what to launch",
            ].map((x) => (
              <li key={x} className="flex items-start gap-2 rounded-lg bg-white/5 px-3 py-2">
                <span className="text-brand-400">→</span> {x}
              </li>
            ))}
          </ul>
          <Link href="/ideas" className="btn-ghost mt-5 px-5 py-2">
            Browse &amp; vote
          </Link>
        </div>
      </section>

      {/* Voting preview — secondary */}
      {topIdeas.length > 0 && (
        <section>
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white">Trending demand ideas</h2>
              <p className="mt-1 text-sm text-slate-400">Vote on services you want — separate from urgent help requests.</p>
            </div>
            <Link href="/ideas" className="btn-ghost shrink-0 px-4 py-2 text-sm">
              See all →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {topIdeas.map((idea) => (
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

      {/* Business CTA */}
      <section className="card border-brand-400/20 p-8 text-center">
        <h2 className="text-2xl font-bold text-white">For businesses</h2>
        <p className="mx-auto mt-3 max-w-xl text-slate-400">
          See what customers need right now — urgent requests and long-term demand votes in one intelligence platform.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/dashboard" className="btn-primary px-8 py-3 text-base">
            Demand dashboard
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
    <div className="card p-4 text-center">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">{label}</div>
      <div className={`mt-1 text-xl font-bold sm:text-2xl ${color}`}>{value}</div>
    </div>
  );
}
