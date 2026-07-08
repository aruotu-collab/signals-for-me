import { prisma } from "@/lib/db";
import { notifyBuyerOfBid, notifyDriverAccepted, notifyDriverPurchaseConfirmed } from "@/lib/ebay/notify";

export type CreateQuoteRequestInput = {
  source?: "ebay" | "manual";
  ebayUrl?: string | null;
  ebayItemId?: string | null;
  itemTitle?: string | null;
  imageUrl?: string | null;
  buyingType?: string | null;
  service?: string | null;
  pickupPostcode?: string | null;
  pickupHub?: string | null;
  pickupTown?: string | null;
  deliveryPostcode: string;
  deliveryOutcode?: string | null;
  distanceMiles?: number | null;
  estimateLow?: number | null;
  estimateHigh?: number | null;
  auctionEndsAt?: string | null;
  itemPrice?: number | null;
  maxItemPrice?: number | null;
  buyerEmail?: string | null;
  buyerPhone?: string | null;
  notes?: string | null;
};

export async function createQuoteRequest(input: CreateQuoteRequestInput) {
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h for drivers to bid
  const source = input.source ?? (input.ebayUrl ? "ebay" : "manual");

  return prisma.deliveryQuoteRequest.create({
    data: {
      source,
      ebayUrl: input.ebayUrl ?? null,
      ebayItemId: input.ebayItemId ?? null,
      itemTitle: input.itemTitle ?? null,
      imageUrl: input.imageUrl ?? null,
      buyingType: input.buyingType ?? null,
      service: input.service ?? null,
      pickupPostcode: input.pickupPostcode ?? null,
      pickupHub: input.pickupHub ?? null,
      pickupTown: input.pickupTown ?? null,
      deliveryPostcode: input.deliveryPostcode,
      deliveryOutcode: input.deliveryOutcode ?? null,
      distanceMiles: input.distanceMiles ?? null,
      estimateLow: input.estimateLow ?? null,
      estimateHigh: input.estimateHigh ?? null,
      auctionEndsAt: input.auctionEndsAt ? new Date(input.auctionEndsAt) : null,
      itemPrice: input.itemPrice != null ? Math.round(input.itemPrice) : null,
      maxItemPrice: input.maxItemPrice ?? null,
      buyerEmail: input.buyerEmail ?? null,
      buyerPhone: input.buyerPhone ?? null,
      notes: input.notes ?? null,
      expiresAt,
      status: "open",
    },
  });
}

export async function getQuoteRequestByToken(token: string) {
  return prisma.deliveryQuoteRequest.findUnique({
    where: { publicToken: token },
    include: {
      bids: { orderBy: { amount: "asc" } },
    },
  });
}

export async function listOpenQuoteRequests(opts?: { limit?: number; hub?: string | null }) {
  const now = new Date();
  return prisma.deliveryQuoteRequest.findMany({
    where: {
      status: "open",
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      ...(opts?.hub && opts.hub !== "all" ? { pickupHub: opts.hub } : {}),
    },
    include: {
      bids: { orderBy: { amount: "asc" }, take: 1 },
      _count: { select: { bids: true } },
    },
    orderBy: { createdAt: "desc" },
    take: opts?.limit ?? 50,
  });
}

/** Distinct hubs that currently have open quote requests (for driver filter). */
export async function listQuoteRequestHubs() {
  const now = new Date();
  const groups = await prisma.deliveryQuoteRequest.groupBy({
    by: ["pickupHub"],
    where: {
      status: "open",
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    _count: { _all: true },
  });
  return groups
    .filter((g): g is typeof g & { pickupHub: string } => Boolean(g.pickupHub))
    .map((g) => ({ hub: g.pickupHub, count: g._count._all }))
    .sort((a, b) => b.count - a.count);
}

export async function submitDriverBid(input: {
  requestId: string;
  driverName?: string;
  driverEmail?: string;
  driverPhone: string;
  amount: number;
  message?: string;
  etaNotes?: string;
}) {
  const req = await prisma.deliveryQuoteRequest.findUnique({ where: { id: input.requestId } });
  if (!req || req.status !== "open") throw new Error("This quote request is no longer open.");

  const bid = await prisma.driverQuoteBid.create({
    data: {
      requestId: input.requestId,
      driverName: input.driverName ?? null,
      driverEmail: input.driverEmail ?? null,
      driverPhone: input.driverPhone,
      amount: input.amount,
      message: input.message ?? null,
      etaNotes: input.etaNotes ?? null,
    },
  });

  await notifyBuyerOfBid(req, bid);
  return bid;
}

export async function acceptDriverBid(bidId: string, requestToken: string) {
  const req = await prisma.deliveryQuoteRequest.findUnique({
    where: { publicToken: requestToken },
    include: { bids: true },
  });
  if (!req) throw new Error("Request not found.");
  const bid = req.bids.find((b) => b.id === bidId);
  if (!bid) throw new Error("Bid not found.");

  await prisma.$transaction([
    prisma.driverQuoteBid.updateMany({
      where: { requestId: req.id, id: { not: bidId } },
      data: { status: "declined" },
    }),
    prisma.driverQuoteBid.update({ where: { id: bidId }, data: { status: "accepted" } }),
    prisma.deliveryQuoteRequest.update({
      where: { id: req.id },
      data: { status: "awarded", acceptedBidId: bidId },
    }),
  ]);

  await notifyDriverAccepted(bid, req);
  return bid;
}

/** Buyer confirms they won the auction / bought the item. */
export async function confirmPurchase(requestToken: string) {
  const req = await prisma.deliveryQuoteRequest.findUnique({
    where: { publicToken: requestToken },
    include: { bids: true },
  });
  if (!req) throw new Error("Request not found.");
  if (!req.acceptedBidId) throw new Error("Accept a driver quote before confirming your purchase.");

  await prisma.deliveryQuoteRequest.update({ where: { id: req.id }, data: { status: "won" } });

  const acceptedBid = req.bids.find((b) => b.id === req.acceptedBidId);
  if (acceptedBid) await notifyDriverPurchaseConfirmed(acceptedBid, req);

  return acceptedBid ?? null;
}
