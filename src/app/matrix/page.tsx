import type { Metadata } from "next";
import { listMatrixHubs, listMatrixServices, getMatrixCells } from "@/lib/shiply";
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

export default async function MatrixPage() {
  const [services, hubs] = await Promise.all([listMatrixServices(), listMatrixHubs()]);

  const serviceNames = services.map((s) => s.service);
  const pickupHubs = hubs.map((h) => h.pickupHub);

  const cells = await getMatrixCells(serviceNames, pickupHubs);

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

      <MatrixGrid services={services} hubs={hubs} cells={cells} />
    </div>
  );
}

