import Link from "next/link";
import { listMatrixPickupKeys, listMatrixServices, getMatrixCells } from "@/lib/shiply";
import { MatrixGrid } from "./ui/MatrixGrid";

export const dynamic = "force-dynamic";

export default async function MatrixPage() {
  const [services, pickups] = await Promise.all([listMatrixServices(), listMatrixPickupKeys()]);

  const serviceNames = services.map((s) => s.service);
  const pickupKeys = pickups.map((p) => p.pickupKey);

  const cells = await getMatrixCells(serviceNames, pickupKeys);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="chip border border-white/10 bg-white/5 text-slate-300">Shiply swipe matrix</span>
          <h1 className="mt-2 text-2xl font-bold text-white">Find jobs fast</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Service types on the left, pickup locations across the top. Swipe to browse — no search needed.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/planner" className="btn-ghost px-4 py-2 text-sm">
            Driver planner
          </Link>
        </div>
      </header>

      <MatrixGrid services={services} pickups={pickups} cells={cells} />
    </div>
  );
}

