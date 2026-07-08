import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { listingSourcePrismaWhere } from "@/lib/shiply/listingSource";
import { ShiplyImportForm } from "./ShiplyImportForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Data import", robots: { index: false, follow: false } };

export default async function AdminShiplyImportPage() {
  const [total, shiply, dqc, matrixCells, lastImport, byService] = await Promise.all([
    prisma.shiplyJob.count(),
    prisma.shiplyJob.count({ where: listingSourcePrismaWhere("shiply") }),
    prisma.shiplyJob.count({ where: listingSourcePrismaWhere("deliveryquotecompare") }),
    prisma.shiplyMatrixCell.count(),
    prisma.shiplyJob.findFirst({ orderBy: { importedAt: "desc" }, select: { importedAt: true } }),
    prisma.shiplyJob.groupBy({
      by: ["service"],
      _count: { _all: true },
      orderBy: { _count: { service: "desc" } },
      take: 6,
    }),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Job data import</h1>
        <p className="text-sm text-slate-400">
          Upload Shiply or DeliveryQuoteCompare exports. Merge mode adds/updates rows; full refresh wipes and replaces
          everything (use for a single master file).
        </p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total jobs" value={total} />
        <Stat label="Shiply" value={shiply} />
        <Stat label="DQC" value={dqc} />
        <Stat label="Matrix cells" value={matrixCells} />
      </div>

      {lastImport && (
        <p className="mb-6 text-xs text-slate-500">
          Last row imported: {lastImport.importedAt.toLocaleString("en-GB")}
        </p>
      )}

      <ShiplyImportForm />

      {byService.length > 0 && (
        <div className="mt-8 card p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Current mix by service</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {byService.map((s) => (
              <div key={s.service} className="rounded-lg bg-white/5 px-3 py-2 text-sm">
                <span className="text-slate-300">{s.service}</span>
                <span className="float-right font-medium text-white">{s._count._all.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-4">
      <div className="text-2xl font-bold text-white">{value.toLocaleString()}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
}
