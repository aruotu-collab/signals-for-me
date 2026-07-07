import Link from "next/link";
import { prisma } from "@/lib/db";
import { listMatrixHubs } from "@/lib/shiply";

export const dynamic = "force-dynamic";

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
      <section className="pt-8">
        <div className="text-center">
          <span className="chip mx-auto border border-white/10 bg-white/5 text-slate-300">Transport job finder</span>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-bold leading-tight text-white sm:text-6xl">
            Find delivery jobs <span className="text-brand-400">by swiping</span>, not searching.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-400">
            Service types down the side, pickup locations across the top. Scroll to the area you cover, tap a cell, and see
            every job — sorted nearest drop-off first, with a direct Shiply link.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/matrix" className="btn-primary px-6 py-3 text-base">
              Open the matrix
            </Link>
            <Link href="/planner" className="btn-ghost px-6 py-3 text-base">
              Driver planner
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
            { n: "01", t: "Browse", d: "Open the matrix — service rows stay frozen, pickup columns scroll." },
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
            Upload your Shiply spreadsheet to populate the matrix.
          </p>
          <Link href="/admin/shiply" className="btn-primary mt-5 inline-flex px-6 py-3">
            Go to import
          </Link>
        </section>
      )}
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
