import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { VansManager } from "./VansManager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Empty vans", robots: { index: false, follow: false } };

export default async function AdminVansPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: rawStatus } = await searchParams;
  const statusFilter = rawStatus && ["active", "cancelled", "expired"].includes(rawStatus) ? rawStatus : "all";
  const now = new Date();

  const where =
    statusFilter === "all"
      ? {}
      : statusFilter === "active"
        ? { status: "active", availableUntil: { gt: now } }
        : { status: statusFilter };

  const [statusGroups, activeCount, rows] = await Promise.all([
    prisma.emptyVan.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.emptyVan.count({ where: { status: "active", availableUntil: { gt: now } } }),
    prisma.emptyVan.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const counts: Record<string, number> = { all: 0, active: activeCount };
  for (const g of statusGroups) {
    counts[g.status] = g._count._all;
    counts.all += g._count._all;
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">Empty van listings</h1>
        <p className="text-sm text-slate-400">
          Driver availability for return-load matching. Cancel spam or expire listings that passed their window.
        </p>
      </header>

      <VansManager
        statusFilter={statusFilter}
        counts={counts}
        initialRows={rows.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
          availableUntil: r.availableUntil.toISOString(),
        }))}
      />
    </div>
  );
}
