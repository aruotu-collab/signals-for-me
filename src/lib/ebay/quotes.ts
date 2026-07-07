import { prisma } from "@/lib/db";

export type CreateQuoteRequestInput = {
  ebayUrl: string;
  ebayItemId?: string | null;
  itemTitle?: string | null;
  imageUrl?: string | null;
  buyingType?: string | null;
  pickupPostcode?: string | null;
  pickupHub?: string | null;
  pickupTown?: string | null;
  deliveryPostcode: string;
  deliveryOutcode?: string | null;
  distanceMiles?: number | null;
  estimateLow?: number | null;
  estimateHigh?: number | null;
  buyerEmail?: string | null;
  buyerPhone?: string | null;
  notes?: string | null;
};

export async function createQuoteRequest(input: CreateQuoteRequestInput) {
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h for drivers to bid

  return prisma.deliveryQuoteRequest.create({
    data: {
      ebayUrl: input.ebayUrl,
      ebayItemId: input.ebayItemId ?? null,
      itemTitle: input.itemTitle ?? null,
      imageUrl: input.imageUrl ?? null,
      buyingType: input.buyingType ?? null,
      pickupPostcode: input.pickupPostcode ?? null,
      pickupHub: input.pickupHub ?? null,
      pickupTown: input.pickupTown ?? null,
      deliveryPostcode: input.deliveryPostcode,
      deliveryOutcode: input.deliveryOutcode ?? null,
      distanceMiles: input.distanceMiles ?? null,
      estimateLow: input.estimateLow ?? null,
      estimateHigh: input.estimateHigh ?? null,
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

export async function listOpenQuoteRequests(limit = 50) {
  const now = new Date();
  return prisma.deliveryQuoteRequest.findMany({
    where: {
      status: "open",
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    include: {
      bids: { orderBy: { amount: "asc" }, take: 1 },
      _count: { select: { bids: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
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

  return prisma.driverQuoteBid.create({
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
    prisma.deliveryQuoteRequest.update({ where: { id: req.id }, data: { status: "awarded" } }),
  ]);

  return bid;
}
