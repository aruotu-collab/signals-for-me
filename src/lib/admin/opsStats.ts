import { prisma } from "@/lib/db";
import { listingSourcePrismaWhere } from "@/lib/shiply/listingSource";

export interface OpsStats {
  jobs: {
    total: number;
    shiply: number;
    deliveryquotecompare: number;
    matrixCells: number;
    lastImportAt: Date | null;
    topServices: { label: string; count: number }[];
    topHubs: { label: string; count: number }[];
  };
  quotes: {
    total: number;
    open: number;
    manual: number;
    ebay: number;
    bidsTotal: number;
    bidsPending: number;
    byStatus: { label: string; count: number }[];
    recent: {
      id: string;
      source: string;
      status: string;
      itemTitle: string | null;
      pickupHub: string | null;
      deliveryPostcode: string;
      bidCount: number;
      createdAt: Date;
    }[];
  };
  vans: {
    total: number;
    active: number;
    byHub: { label: string; count: number }[];
  };
  users: {
    total: number;
    new7d: number;
    withDriverProfile: number;
    savedJobs: number;
  };
  leads: {
    new: number;
    total: number;
  };
}

const DAY = 86_400_000;

export async function loadOpsStats(): Promise<OpsStats> {
  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * DAY);

  const [
    totalJobs,
    shiplyJobs,
    dqcJobs,
    matrixCells,
    lastImportRow,
    quoteTotal,
    quoteOpen,
    quoteManual,
    quoteEbay,
    bidsTotal,
    bidsPending,
    vansTotal,
    vansActive,
    usersTotal,
    usersNew7d,
    driverProfiles,
    savedJobs,
    leadsTotal,
    leadsNew,
    quoteStatusGroups,
    topServices,
    topHubs,
    vanHubGroups,
    recentQuotes,
  ] = await Promise.all([
    prisma.shiplyJob.count(),
    prisma.shiplyJob.count({ where: listingSourcePrismaWhere("shiply") }),
    prisma.shiplyJob.count({ where: listingSourcePrismaWhere("deliveryquotecompare") }),
    prisma.shiplyMatrixCell.count(),
    prisma.shiplyJob.findFirst({ orderBy: { importedAt: "desc" }, select: { importedAt: true } }),
    prisma.deliveryQuoteRequest.count(),
    prisma.deliveryQuoteRequest.count({ where: { status: "open" } }),
    prisma.deliveryQuoteRequest.count({ where: { source: "manual" } }),
    prisma.deliveryQuoteRequest.count({ where: { source: "ebay" } }),
    prisma.driverQuoteBid.count(),
    prisma.driverQuoteBid.count({ where: { status: "pending" } }),
    prisma.emptyVan.count(),
    prisma.emptyVan.count({ where: { status: "active", availableUntil: { gt: now } } }),
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: d7 } } }),
    prisma.driverProfile.count(),
    prisma.savedJob.count(),
    prisma.serviceRequest.count(),
    prisma.serviceRequest.count({ where: { status: "new" } }),
    prisma.deliveryQuoteRequest.groupBy({
      by: ["status"],
      _count: { _all: true },
      orderBy: { _count: { status: "desc" } },
    }),
    prisma.shiplyJob.groupBy({
      by: ["service"],
      _count: { _all: true },
      orderBy: { _count: { service: "desc" } },
      take: 8,
    }),
    prisma.shiplyJob.groupBy({
      by: ["pickupHub"],
      _count: { _all: true },
      orderBy: { _count: { pickupHub: "desc" } },
      take: 8,
    }),
    prisma.emptyVan.groupBy({
      by: ["hub"],
      where: { status: "active", availableUntil: { gt: now } },
      _count: { _all: true },
      orderBy: { _count: { hub: "desc" } },
      take: 6,
    }),
    prisma.deliveryQuoteRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        source: true,
        status: true,
        itemTitle: true,
        pickupHub: true,
        deliveryPostcode: true,
        createdAt: true,
        _count: { select: { bids: true } },
      },
    }),
  ]);

  return {
    jobs: {
      total: totalJobs,
      shiply: shiplyJobs,
      deliveryquotecompare: dqcJobs,
      matrixCells,
      lastImportAt: lastImportRow?.importedAt ?? null,
      topServices: topServices.map((r) => ({ label: r.service, count: r._count._all })),
      topHubs: topHubs.map((r) => ({ label: r.pickupHub, count: r._count._all })),
    },
    quotes: {
      total: quoteTotal,
      open: quoteOpen,
      manual: quoteManual,
      ebay: quoteEbay,
      bidsTotal,
      bidsPending,
      byStatus: quoteStatusGroups.map((g) => ({ label: g.status, count: g._count._all })),
      recent: recentQuotes.map((q) => ({
        id: q.id,
        source: q.source,
        status: q.status,
        itemTitle: q.itemTitle,
        pickupHub: q.pickupHub,
        deliveryPostcode: q.deliveryPostcode,
        bidCount: q._count.bids,
        createdAt: q.createdAt,
      })),
    },
    vans: {
      total: vansTotal,
      active: vansActive,
      byHub: vanHubGroups.map((g) => ({ label: g.hub, count: g._count._all })),
    },
    users: {
      total: usersTotal,
      new7d: usersNew7d,
      withDriverProfile: driverProfiles,
      savedJobs,
    },
    leads: {
      new: leadsNew,
      total: leadsTotal,
    },
  };
}
