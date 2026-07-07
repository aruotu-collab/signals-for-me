import Link from "next/link";
import { listPlannerHubs, getPlannerJobs, buildOptimizedRoute } from "@/lib/shiply";
import { PlannerJobList } from "./PlannerJobList";

export const dynamic = "force-dynamic";

export default async function PlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; service?: string; mode?: string }>;
}) {
  const { from, service, mode } = await searchParams;
  const hubs = await listPlannerHubs(120);

  const activeFrom = from || hubs[0]?.pickupHub || "";
  const activeMode = mode === "miles" ? "miles" : "route";
  const rawJobs = activeFrom ? await getPlannerJobs(activeFrom, service ?? null) : [];

  const { ordered, legMiles } =
    activeMode === "route"
      ? buildOptimizedRoute(rawJobs)
      : { ordered: rawJobs, legMiles: rawJobs.map(() => null as number | null) };

  const geocodedCount = rawJobs.filter((j) => j.deliveryLat != null).length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="chip border border-white/10 bg-white/5 text-slate-300">Driver planner</span>
          <h1 className="mt-2 text-2xl font-bold text-white">Plan from a starting area</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Pick where you&apos;re starting. Choose an optimized nearest-next-stop route, or sort by distance from the
            start.
          </p>
        </div>
        <Link href="/matrix" className="btn-ghost px-4 py-2 text-sm">
          Back to Pickup Radar
        </Link>
      </header>

      {hubs.length === 0 ? (
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
            {hubs.slice(0, 40).map((h) => (
              <Link
                key={h.pickupHub}
                href={`/planner?from=${encodeURIComponent(h.pickupHub)}&mode=${activeMode}`}
                className={`chip ${
                  h.pickupHub === activeFrom ? "bg-brand-500/20 text-brand-200" : "bg-white/5 text-slate-400 hover:text-white"
                }`}
              >
                {h.pickupHub} · {h.count}
              </Link>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500">Ordering:</span>
            <Link
              href={`/planner?from=${encodeURIComponent(activeFrom)}&mode=route`}
              className={`chip ${activeMode === "route" ? "bg-brand-500/20 text-brand-200" : "bg-white/5 text-slate-400 hover:text-white"}`}
            >
              🧭 Optimized route (nearest next stop)
            </Link>
            <Link
              href={`/planner?from=${encodeURIComponent(activeFrom)}&mode=miles`}
              className={`chip ${activeMode === "miles" ? "bg-brand-500/20 text-brand-200" : "bg-white/5 text-slate-400 hover:text-white"}`}
            >
              📏 Distance from start
            </Link>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white">
              Starting hub <span className="text-brand-300">{activeFrom}</span> · {ordered.length} jobs
            </h2>
            {activeMode === "route" && (
              <p className="mt-1 text-xs text-slate-500">
                {geocodedCount} of {rawJobs.length} jobs have postcode coordinates. Chain uses real distances between
                drop-offs; jobs without coordinates are listed last.
              </p>
            )}
            <PlannerJobList jobs={ordered} legMiles={legMiles} mode={activeMode} />
          </div>
        </>
      )}
    </div>
  );
}
