import { prisma } from "@/lib/db";

export type MarkEmptyVanInput = {
  driverPhone: string;
  driverName?: string | null;
  driverEmail?: string | null;
  hub: string;
  postcode?: string | null;
  headingHub?: string | null;
  headingPostcode?: string | null;
  vanSize?: string | null;
  note?: string | null;
  /** Hours the availability stays live (default 24, capped 1..168). */
  hours?: number;
};

export async function markVanEmpty(input: MarkEmptyVanInput) {
  const hours = Math.min(Math.max(input.hours ?? 24, 1), 168);
  const availableUntil = new Date(Date.now() + hours * 60 * 60 * 1000);

  return prisma.emptyVan.create({
    data: {
      driverPhone: input.driverPhone,
      driverName: input.driverName ?? null,
      driverEmail: input.driverEmail ?? null,
      hub: input.hub,
      postcode: input.postcode ?? null,
      headingHub: input.headingHub ?? null,
      headingPostcode: input.headingPostcode ?? null,
      vanSize: input.vanSize ?? null,
      note: input.note ?? null,
      availableUntil,
      status: "active",
    },
  });
}

export async function cancelEmptyVan(id: string) {
  return prisma.emptyVan.update({
    where: { id },
    data: { status: "cancelled" },
  });
}

function activeWhere() {
  return {
    status: "active",
    availableUntil: { gt: new Date() },
  };
}

/** All live empty vans (most recent first). */
export async function listActiveEmptyVans(opts?: { limit?: number; hub?: string | null }) {
  return prisma.emptyVan.findMany({
    where: {
      ...activeWhere(),
      ...(opts?.hub && opts.hub !== "all" ? { hub: opts.hub } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: opts?.limit ?? 100,
  });
}

/** Aggregated counts of empty vans by hub (for buyer-facing "capacity nearby"). */
export async function countEmptyVansByHub(): Promise<Map<string, number>> {
  const groups = await prisma.emptyVan.groupBy({
    by: ["hub"],
    where: activeWhere(),
    _count: { _all: true },
  });
  const map = new Map<string, number>();
  for (const g of groups) map.set(g.hub, g._count._all);
  return map;
}

/**
 * How many live vans could serve a job pickup hub — either empty *in* that hub
 * or heading *towards* it. Used to show buyers "N drivers near your pickup".
 */
export async function countVansForHub(hub: string | null | undefined): Promise<number> {
  if (!hub) return 0;
  return prisma.emptyVan.count({
    where: {
      ...activeWhere(),
      OR: [{ hub }, { headingHub: hub }],
    },
  });
}

/**
 * Return-load matches for a driver who is empty in `hub` (optionally heading to
 * `headingHub`): open quote requests picking up from that hub, or — when a
 * heading is set — delivering towards it (corridor match).
 */
export async function matchJobsForEmptyVan(input: {
  hub: string;
  headingHub?: string | null;
  limit?: number;
}) {
  const now = new Date();
  const requests = await prisma.deliveryQuoteRequest.findMany({
    where: {
      status: "open",
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      AND: [
        {
          OR: [
            { pickupHub: input.hub },
            ...(input.headingHub ? [{ pickupHub: input.headingHub }] : []),
          ],
        },
      ],
    },
    include: {
      bids: { orderBy: { amount: "asc" }, take: 1 },
      _count: { select: { bids: true } },
    },
    orderBy: { createdAt: "desc" },
    take: input.limit ?? 50,
  });

  return requests.map((r) => ({
    ...r,
    matchReason:
      r.pickupHub === input.hub
        ? (`Pickup in ${input.hub}` as const)
        : (`On your route to ${input.headingHub}` as const),
  }));
}
