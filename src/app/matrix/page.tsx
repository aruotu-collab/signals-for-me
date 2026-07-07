import type { Metadata } from "next";
import Link from "next/link";
import { listMatrixHubs, listMatrixServices, getMatrixCells } from "@/lib/shiply";
import { MatrixGrid } from "./ui/MatrixGrid";

export const metadata: Metadata = {
  title: "Pickup Radar — delivery jobs by pickup location",
  description:
    "Scan delivery work by pickup hub and service type. Tap a cell to see jobs by sub-area — nearest drop-off first, with direct Shiply links.",
};

export const dynamic = "force-dynamic";

export default async function MatrixPage() {
  const [services, hubs] = await Promise.all([listMatrixServices(), listMatrixHubs()]);

  const serviceNames = services.map((s) => s.service);
  const pickupHubs = hubs.map((h) => h.pickupHub);

  const cells = await getMatrixCells(serviceNames, pickupHubs);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="chip border border-white/10 bg-white/5 text-slate-300">Route Radar</span>
          <h1 className="mt-2 text-2xl font-bold text-white">Pickup Radar</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Delivery intelligence by pickup location — service types on the left, major pickup hubs across the top (~
            {hubs.length} UK cities). Tap a cell to see jobs by sub-area.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/planner" className="btn-ghost px-4 py-2 text-sm">
            Driver planner
          </Link>
        </div>
      </header>

      <MatrixGrid services={services} hubs={hubs} cells={cells} />
    </div>
  );
}

