import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import { prisma } from "@/lib/db";
import { buildPageMetadata, faqJsonLd, HOME_FAQ } from "@/lib/seo";
import { listMatrixHubs } from "@/lib/shiply";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
  title: "UK delivery jobs by pickup location — Pickup Radar for drivers",
  description:
    "Find courier and van delivery jobs across the UK. Pickup Radar maps Shiply work by hub and service — profit estimates, route planner, and eBay delivery quotes. Free for drivers and buyers.",
  path: "/",
  keywords: [
    "UK delivery jobs",
    "courier jobs near me",
    "Shiply jobs",
    "delivery driver jobs UK",
    "van courier work",
    "eBay delivery quote",
  ],
});

export default async function Home() {
  let jobCount = 0;
  let serviceCount = 0;
  let topHubs: { pickupHub: string; count: number }[] = [];

  try {
    [jobCount, serviceCount, topHubs] = await Promise.all([
      prisma.shiplyJob.count(),
      prisma.shiplyJob.findMany({ distinct: ["service"], select: { service: true } }).then((r) => r.length),
      listMatrixHubs(12),
    ]);
  } catch {
    // DB may be empty pre-import
  }

  return (
    <div className="space-y-16">
      <JsonLd data={faqJsonLd(HOME_FAQ)} />
      <section className="pt-8">
        <div className="text-center">
          <span className="chip mx-auto border border-white/10 bg-white/5 text-slate-300">Route Radar · Driver intelligence</span>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-bold leading-tight text-white sm:text-6xl">
            Find delivery work <span className="text-brand-400">by pickup location</span>.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-400">
            Route Radar shows where jobs cluster across the UK. Open <strong className="font-medium text-slate-300">Pickup Radar</strong> to
            scan your patch — service types down the side, pickup locations across the top. Tap a cell for every job,
            nearest drop-off first, with a direct Shiply link.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/matrix" className="btn-primary px-6 py-3 text-base">
              Open Pickup Radar
            </Link>
            <Link href="/planner" className="btn-ghost px-6 py-3 text-base">
              Driver planner
            </Link>
            <Link href="/quotes" className="btn-ghost px-6 py-3 text-base">
              Get a quote
            </Link>
            <Link href="/opportunities" className="btn-ghost px-6 py-3 text-base">
              eBay jobs
            </Link>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <HeroStat label="Jobs indexed" value={jobCount.toLocaleString()} />
          <HeroStat label="Service types" value={serviceCount.toLocaleString()} tone="growth" />
          <HeroStat label="Pickup hubs" value={topHubs.length ? "60+" : "0"} />
        </div>
      </section>

      {topHubs.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-white">Top pickup hubs</h2>
          <p className="mt-1 text-sm text-slate-400">Major UK cities with the most jobs — jump straight to route planning.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {topHubs.map((h) => (
              <Link
                key={h.pickupHub}
                href={`/planner?from=${encodeURIComponent(h.pickupHub)}`}
                className="chip bg-white/5 text-slate-300 hover:bg-brand-500/15 hover:text-brand-200"
              >
                {h.pickupHub} · {h.count}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-center text-2xl font-bold text-white">How it works</h2>
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-4">
          {[
            { n: "01", t: "Open Pickup Radar", d: "Service rows stay frozen; swipe across pickup locations you cover." },
            { n: "02", t: "Swipe", d: "Slide across to the pickup area you cover. No search box needed." },
            { n: "03", t: "Tap a cell", d: "See every job for that service and area, nearest drop-off first." },
            { n: "04", t: "Open Shiply", d: "Click through to the job — log in on Shiply to quote." },
          ].map((s) => (
            <div key={s.n} className="card p-5">
              <div className="text-sm font-bold text-brand-400">{s.n}</div>
              <div className="mt-1 text-lg font-semibold text-white">{s.t}</div>
              <p className="mt-1 text-sm text-slate-400">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {jobCount === 0 && (
        <section className="card p-8 text-center">
          <h2 className="text-xl font-bold text-white">No jobs imported yet</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-slate-400">
            Upload your Shiply spreadsheet to populate Pickup Radar.
          </p>
          <Link href="/admin/shiply" className="btn-primary mt-5 inline-flex px-6 py-3">
            Go to import
          </Link>
        </section>
      )}

      <section className="card p-6">
        <h2 className="text-xl font-bold text-white">Frequently asked questions</h2>
        <dl className="mt-6 space-y-5">
          {HOME_FAQ.map((item) => (
            <div key={item.question}>
              <dt className="font-medium text-white">{item.question}</dt>
              <dd className="mt-1 text-sm text-slate-400">{item.answer}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-white">Browse jobs by area or type</h2>
        <p className="mt-1 text-sm text-slate-400">
          Explore delivery work by UK pickup area or job type — each page lists live counts and sample listings.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/jobs" className="btn-ghost px-4 py-2 text-sm">
            Jobs by area →
          </Link>
          <Link href="/delivery-jobs" className="btn-ghost px-4 py-2 text-sm">
            Jobs by type →
          </Link>
        </div>
      </section>
    </div>
  );
}

function HeroStat({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "growth" | "neutral" }) {
  const color = tone === "growth" ? "text-signal-growth" : "text-white";
  return (
    <div className="card p-6 text-center">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-2 text-3xl font-bold sm:text-4xl ${color}`}>{value}</div>
    </div>
  );
}
