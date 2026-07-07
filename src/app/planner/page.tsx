import Link from "next/link";
import { listPlannerPickupKeys, getPlannerJobs } from "@/lib/shiply";

export const dynamic = "force-dynamic";

export default async function PlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; service?: string }>;
}) {
  const { from, service } = await searchParams;
  const pickups = await listPlannerPickupKeys(200);

  const activeFrom = from || pickups[0]?.pickupKey || "";
  const jobs = activeFrom ? await getPlannerJobs(activeFrom, service ?? null) : [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="chip border border-white/10 bg-white/5 text-slate-300">Driver planner</span>
          <h1 className="mt-2 text-2xl font-bold text-white">Plan from a starting area</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Pick where you&apos;re starting. Jobs are listed nearest drop-off first, so you can plan the run.
          </p>
        </div>
        <Link href="/matrix" className="btn-ghost px-4 py-2 text-sm">
          Back to matrix
        </Link>
      </header>

      {pickups.length === 0 ? (
        <div className="card p-8 text-center text-sm text-slate-400">
          No Shiply jobs imported yet. Go to{" "}
          <Link href="/admin/shiply" className="text-brand-300 underline">
            Admin → Shiply
          </Link>{" "}
          to upload your spreadsheet.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {pickups.slice(0, 40).map((p) => (
              <Link
                key={p.pickupKey}
                href={`/planner?from=${encodeURIComponent(p.pickupKey)}`}
                className={`chip ${
                  p.pickupKey === activeFrom ? "bg-brand-500/20 text-brand-200" : "bg-white/5 text-slate-400 hover:text-white"
                }`}
              >
                {p.pickupKey} · {p.count}
              </Link>
            ))}
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white">
              Starting from <span className="text-brand-300">{activeFrom}</span> · {jobs.length} jobs
            </h2>
            <ol className="mt-4 space-y-3">
              {jobs.map((j, i) => (
                <li key={j.shiplyKey}>
                  <a
                    href={j.shiplyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-brand-400/30"
                  >
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-500/15 text-sm font-bold text-brand-200">
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-1 text-sm font-medium text-white">{j.title}</div>
                      <div className="text-xs text-slate-400">
                        {j.pickupTown} → {j.deliveryTown} · {j.service}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      {j.miles != null && <div className="text-sm font-semibold text-white">{j.miles} mi</div>}
                      {j.quotes != null && <div className="text-[11px] text-slate-500">{j.quotes} quotes</div>}
                    </div>
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </>
      )}
    </div>
  );
}
