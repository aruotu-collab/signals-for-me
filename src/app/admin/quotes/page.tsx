import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { QuotesManager } from "./QuotesManager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Quote requests", robots: { index: false, follow: false } };

export default async function AdminQuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: rawStatus } = await searchParams;
  const statusFilter = rawStatus && rawStatus !== "all" ? rawStatus : "all";

  const [statusGroups, rows] = await Promise.all([
    prisma.deliveryQuoteRequest.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.deliveryQuoteRequest.findMany({
      where: statusFilter === "all" ? {} : { status: statusFilter },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        publicToken: true,
        source: true,
        status: true,
        itemTitle: true,
        ebayUrl: true,
        pickupHub: true,
        pickupPostcode: true,
        deliveryPostcode: true,
        distanceMiles: true,
        estimateLow: true,
        estimateHigh: true,
        buyerEmail: true,
        buyerPhone: true,
        notes: true,
        createdAt: true,
        _count: { select: { bids: true } },
        bids: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            driverName: true,
            driverPhone: true,
            driverEmail: true,
            amount: true,
            status: true,
            message: true,
            createdAt: true,
          },
        },
      },
    }),
  ]);

  const counts: Record<string, number> = {};
  for (const g of statusGroups) counts[g.status] = g._count._all;

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">Delivery quote requests</h1>
        <p className="text-sm text-slate-400">
          eBay and manual buyer jobs. Drivers bid via the public tracker — update status or review bids here.
        </p>
      </header>

      <QuotesManager
        statusFilter={statusFilter}
        counts={counts}
        initialRows={rows.map((r) => ({
          ...r,
          bidCount: r._count.bids,
          createdAt: r.createdAt.toISOString(),
          bids: r.bids.map((b) => ({ ...b, createdAt: b.createdAt.toISOString() })),
        }))}
      />

      <p className="mt-6 text-xs text-slate-500">
        Showing latest 50.{" "}
        <Link href="/quotes" className="text-brand-300 hover:underline">
          Open public quotes hub
        </Link>
      </p>
    </div>
  );
}
