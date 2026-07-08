import type { Metadata } from "next";
import { listMatrixHubs, listMatrixServices, getMatrixCells, getPickupCountriesForKeys } from "@/lib/shiply";
import { buildPageMetadata } from "@/lib/seo";
import { MatrixGrid } from "./ui/MatrixGrid";

export const metadata: Metadata = buildPageMetadata({
  title: "Pickup Radar — UK delivery jobs by pickup location",
  description:
    "Scan live UK courier jobs by pickup hub and service type. Tap a cell for fuel cost, winning bid estimates, and profit — with direct Shiply links.",
  path: "/matrix",
  keywords: ["Pickup Radar", "Shiply jobs matrix", "delivery jobs by hub", "courier job map UK"],
});

export const dynamic = "force-dynamic";

function keysFromCells(cells: { jobKeys: string }[]): string[] {
  const set = new Set<string>();
  for (const cell of cells) {
    try {
      const arr = JSON.parse(cell.jobKeys);
      if (Array.isArray(arr)) {
        for (const k of arr) set.add(String(k));
      }
    } catch {
      // ignore malformed JSON
    }
  }
  return Array.from(set);
}

export default async function MatrixPage() {
  const [services, hubs] = await Promise.all([listMatrixServices(), listMatrixHubs()]);

  const serviceNames = services.map((s) => s.service);
  const pickupHubs = hubs.map((h) => h.pickupHub);

  const cells = await getMatrixCells(serviceNames, pickupHubs);
  const countryByKey = await getPickupCountriesForKeys(keysFromCells(cells));

  return (
    <div className="space-y-6">
      <header>
        <div>
          <span className="chip border border-white/10 bg-white/5 text-slate-300">Route Radar</span>
          <h1 className="mt-2 text-2xl font-bold text-white">Pickup Radar</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Delivery intelligence by pickup location — tap a cell for est. fuel, winning bid, and profit on every job.
          </p>
        </div>
      </header>

      <MatrixGrid services={services} hubs={hubs} cells={cells} countryByKey={countryByKey} />
    </div>
  );
}

