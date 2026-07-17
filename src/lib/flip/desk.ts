import type { FlipOpportunity } from "@/lib/flip/types";

export const FLIP_DESK_STORAGE_KEY = "sfm.flipDesk.v1";
export const FLIP_SEEN_STORAGE_KEY = "sfm.flipSeen.v1";
export const FLIP_DESK_EVENT = "sfm:flip-desk";

export type FlipDeskStatus =
  | "watching"
  | "bidding"
  | "incoming"
  | "stock"
  | "selling"
  | "sold"
  | "lost";

export const FLIP_DESK_STATUSES: FlipDeskStatus[] = [
  "watching",
  "bidding",
  "incoming",
  "stock",
  "selling",
  "sold",
  "lost",
];

export const FLIP_DESK_STATUS_LABEL: Record<FlipDeskStatus, string> = {
  watching: "Watching",
  bidding: "Bidding",
  incoming: "Awaiting delivery",
  stock: "In stock",
  selling: "Selling",
  sold: "Sold",
  lost: "Lost",
};

export type FlipDeskItem = {
  id: string;
  title: string;
  ebayUrl: string;
  imageUrl: string | null;
  category: string;
  brand: string | null;
  status: FlipDeskStatus;
  currentPrice: number;
  maxBid: number;
  marketValue: number;
  estimatedProfit: number;
  dealScore: number;
  endsAt: string | null;
  /** What you actually paid when you won (item price) */
  buyPrice: number | null;
  /** Postage / courier to receive the item */
  inboundPostage: number | null;
  /** What you sold for */
  sellPrice: number | null;
  /** Realised net after rough fee estimate, or manual override */
  actualProfit: number | null;
  notes: string | null;
  addedAt: number;
  updatedAt: number;
  wonAt: number | null;
  receivedAt: number | null;
  soldAt: number | null;
};

export type FlipDeskStats = {
  watching: number;
  bidding: number;
  incoming: number;
  stock: number;
  selling: number;
  sold: number;
  lost: number;
  /** Estimated profit still in the pipeline (watch → selling) */
  plannedProfit: number;
  /** Banked profit from sold flips */
  bankedProfit: number;
  /** Cash tied up in incoming / stock / selling */
  capitalTied: number;
  /** Cash specifically waiting on delivery */
  awaitingDelivery: number;
  /** Pipeline + banked */
  totalPicture: number;
};

type LegacyStatus = FlipDeskStatus | "won";

function normalizeStatus(status: LegacyStatus): FlipDeskStatus {
  // Older desk items used "won" for paid-but-not-necessarily-received.
  if (status === "won") return "incoming";
  return status;
}

function normalizeItem(raw: FlipDeskItem & { status: LegacyStatus }): FlipDeskItem {
  return {
    ...raw,
    status: normalizeStatus(raw.status),
    inboundPostage: raw.inboundPostage ?? null,
    receivedAt: raw.receivedAt ?? null,
  };
}

export function opportunityToDeskItem(opp: FlipOpportunity): FlipDeskItem {
  const now = Date.now();
  return {
    id: opp.id,
    title: opp.title,
    ebayUrl: opp.ebayUrl,
    imageUrl: opp.imageUrl,
    category: opp.category,
    brand: opp.brand,
    status: "watching",
    currentPrice: opp.currentPrice,
    maxBid: opp.maxBid,
    marketValue: opp.marketValue,
    estimatedProfit: opp.netProfit,
    dealScore: opp.dealScore,
    endsAt: opp.endsAt,
    buyPrice: null,
    inboundPostage: null,
    sellPrice: null,
    actualProfit: null,
    notes: null,
    addedAt: now,
    updatedAt: now,
    wonAt: null,
    receivedAt: null,
    soldAt: null,
  };
}

export function readFlipDesk(): FlipDeskItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(FLIP_DESK_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as (FlipDeskItem & { status: LegacyStatus })[];
    return Array.isArray(parsed) ? parsed.map(normalizeItem) : [];
  } catch {
    return [];
  }
}

export function writeFlipDesk(list: FlipDeskItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FLIP_DESK_STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(FLIP_DESK_EVENT));
  } catch {
    // ignore quota
  }
}

export function readSeenIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(FLIP_SEEN_STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function writeSeenIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    const arr = [...ids].slice(-500);
    window.localStorage.setItem(FLIP_SEEN_STORAGE_KEY, JSON.stringify(arr));
  } catch {
    // ignore
  }
}

/** Mark scan results as seen; return ids that were brand new (not on cold start). */
export function rememberScanIds(ids: string[]): Set<string> {
  const seen = readSeenIds();
  const coldStart = seen.size === 0;
  const fresh = new Set<string>();
  for (const id of ids) {
    if (!coldStart && !seen.has(id)) fresh.add(id);
    seen.add(id);
  }
  writeSeenIds(seen);
  return fresh;
}

export function itemCost(item: FlipDeskItem): number {
  return (item.buyPrice ?? item.currentPrice) + (item.inboundPostage ?? 0);
}

export function daysWaiting(item: FlipDeskItem): number | null {
  if (item.status !== "incoming" || !item.wonAt) return null;
  return Math.max(0, Math.floor((Date.now() - item.wonAt) / 86_400_000));
}

export function computeDeskStats(items: FlipDeskItem[]): FlipDeskStats {
  const activePlan = new Set<FlipDeskStatus>(["watching", "bidding", "incoming", "stock", "selling"]);
  const capitalStatuses = new Set<FlipDeskStatus>(["incoming", "stock", "selling"]);
  let plannedProfit = 0;
  let bankedProfit = 0;
  let capitalTied = 0;
  let awaitingDelivery = 0;
  const counts = {
    watching: 0,
    bidding: 0,
    incoming: 0,
    stock: 0,
    selling: 0,
    sold: 0,
    lost: 0,
  };

  for (const item of items) {
    counts[item.status] += 1;
    if (activePlan.has(item.status)) {
      plannedProfit += item.estimatedProfit;
    }
    if (item.status === "sold") {
      bankedProfit += item.actualProfit ?? item.estimatedProfit;
    }
    if (capitalStatuses.has(item.status)) {
      const cost = itemCost(item);
      capitalTied += cost;
      if (item.status === "incoming") awaitingDelivery += cost;
    }
  }

  return {
    ...counts,
    plannedProfit: Math.round(plannedProfit * 100) / 100,
    bankedProfit: Math.round(bankedProfit * 100) / 100,
    capitalTied: Math.round(capitalTied * 100) / 100,
    awaitingDelivery: Math.round(awaitingDelivery * 100) / 100,
    totalPicture: Math.round((plannedProfit + bankedProfit) * 100) / 100,
  };
}

export function sortDesk(list: FlipDeskItem[]): FlipDeskItem[] {
  const order: Record<FlipDeskStatus, number> = {
    bidding: 0,
    watching: 1,
    incoming: 2,
    stock: 3,
    selling: 4,
    sold: 5,
    lost: 6,
  };
  return [...list].sort((a, b) => {
    const byStatus = order[a.status] - order[b.status];
    if (byStatus !== 0) return byStatus;
    // Oldest waiting deliveries first
    if (a.status === "incoming" && b.status === "incoming") {
      return (a.wonAt ?? 0) - (b.wonAt ?? 0);
    }
    const aEnd = a.endsAt ? new Date(a.endsAt).getTime() : Number.POSITIVE_INFINITY;
    const bEnd = b.endsAt ? new Date(b.endsAt).getTime() : Number.POSITIVE_INFINITY;
    return aEnd - bEnd;
  });
}
