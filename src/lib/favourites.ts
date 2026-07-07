// Shared job-board types, source adapters and localStorage helpers.
// The React state/sync layer lives in components/FavouritesProvider.tsx.

export type FavouriteSource = "shiply" | "ebay" | "manual";

export type JobStatus = "saved" | "won" | "completed";

export type FavouriteItem = {
  /** Stable identity: `${source}:${sourceId}`. */
  key: string;
  source: FavouriteSource;
  sourceId: string;
  url: string;
  title: string;
  imageUrl: string | null;
  /** Route or pickup location, e.g. "London → Ashford" or "Manchester · M2". */
  line1: string | null;
  service: string | null;
  /** Secondary detail, e.g. "246 mi · 3 quotes" or "Auction · £45". */
  detail: string | null;
  status: JobStatus;
  miles: number | null;
  quotes: number | null;
  /** Winning bid / payment in GBP — set when status is won or completed. */
  actualBid: number | null;
  notes: string | null;
  savedAt: number;
  wonAt: number | null;
  completedAt: number | null;
};

export type FavouriteInput = Omit<FavouriteItem, "savedAt" | "wonAt" | "completedAt"> & {
  savedAt?: number;
  wonAt?: number | null;
  completedAt?: number | null;
};

export type ManualJobInput = {
  title: string;
  pickup: string;
  delivery: string;
  miles: number;
  payment: number;
  service?: string;
  notes?: string;
  url?: string;
};

// ---- Source adapters ---------------------------------------------------------

type ShiplyJobLike = {
  shiplyKey: string;
  shiplyUrl: string;
  title: string;
  imageUrl: string | null;
  pickupTown?: string | null;
  pickupKey?: string | null;
  deliveryTown: string;
  miles: number | null;
  quotes: number | null;
  service: string;
};

export function shiplyFavourite(job: ShiplyJobLike): FavouriteInput {
  const from = job.pickupTown || job.pickupKey || "Pickup";
  const detailParts: string[] = [];
  if (job.miles != null) detailParts.push(`${job.miles} mi`);
  if (job.quotes != null) detailParts.push(`${job.quotes} quotes`);
  return {
    key: `shiply:${job.shiplyKey}`,
    source: "shiply",
    sourceId: job.shiplyKey,
    url: job.shiplyUrl,
    title: job.title,
    imageUrl: job.imageUrl ?? null,
    line1: `${from} → ${job.deliveryTown}`,
    service: job.service || null,
    detail: detailParts.join(" · ") || null,
    status: "saved",
    miles: job.miles,
    quotes: job.quotes,
    actualBid: null,
    notes: null,
  };
}

type EbayListingLike = {
  id: string;
  title: string;
  imageUrl: string | null;
  ebayUrl: string;
  pickupHub: string;
  subArea?: string | null;
  category: string;
  buyingType: string;
  price: number | null;
  currency?: string;
  distanceMiles?: number | null;
};

export function ebayFavourite(listing: EbayListingLike): FavouriteInput {
  const loc = listing.subArea ? `${listing.pickupHub} · ${listing.subArea}` : listing.pickupHub;
  const detailParts: string[] = [listing.buyingType];
  if (listing.price != null) {
    detailParts.push(`${listing.currency === "GBP" || !listing.currency ? "£" : ""}${listing.price}`);
  }
  if (listing.distanceMiles != null) detailParts.push(`${listing.distanceMiles} mi`);
  return {
    key: `ebay:${listing.id}`,
    source: "ebay",
    sourceId: listing.id,
    url: listing.ebayUrl,
    title: listing.title,
    imageUrl: listing.imageUrl ?? null,
    line1: loc,
    service: listing.category || null,
    detail: detailParts.join(" · ") || null,
    status: "saved",
    miles: listing.distanceMiles ?? null,
    quotes: null,
    actualBid: null,
    notes: null,
  };
}

export function manualFavourite(input: ManualJobInput, id?: string): FavouriteInput {
  const sourceId = id ?? `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const detailParts = [`${input.miles} mi`, `£${input.payment}`];
  return {
    key: `manual:${sourceId}`,
    source: "manual",
    sourceId,
    url: input.url?.trim() || "#",
    title: input.title.trim() || `${input.pickup} → ${input.delivery}`,
    imageUrl: null,
    line1: `${input.pickup} → ${input.delivery}`,
    service: input.service?.trim() || "Manual",
    detail: detailParts.join(" · "),
    status: "won",
    miles: input.miles,
    quotes: null,
    actualBid: input.payment,
    notes: input.notes?.trim() || null,
  };
}

export function statusRank(status: JobStatus): number {
  if (status === "completed") return 3;
  if (status === "won") return 2;
  return 1;
}

/** Prefer the furthest lifecycle stage when merging local + server copies. */
export function mergeJobStatus(a: JobStatus, b: JobStatus): JobStatus {
  return statusRank(a) >= statusRank(b) ? a : b;
}

// ---- localStorage layer ------------------------------------------------------

export const STORAGE_KEY = "sfm.favourites.v3";
export const FAVOURITES_EVENT = "sfm-favourites-changed";
const LEGACY_V2_KEY = "sfm.favourites.v2";
const LEGACY_V1_KEY = "sfm.favourites.v1";

type LegacyV2Favourite = Omit<FavouriteItem, "status" | "miles" | "quotes" | "actualBid" | "notes" | "wonAt" | "completedAt"> & {
  status?: JobStatus;
  miles?: number | null;
  quotes?: number | null;
  actualBid?: number | null;
  notes?: string | null;
  wonAt?: number | null;
  completedAt?: number | null;
};

type LegacyFavourite = {
  shiplyKey: string;
  shiplyUrl: string;
  title: string;
  imageUrl: string | null;
  pickupTown: string;
  pickupKey: string;
  deliveryTown: string;
  miles: number | null;
  quotes: number | null;
  service: string;
  savedAt: number;
};

function normalizeItem(raw: LegacyV2Favourite): FavouriteItem {
  return {
    key: raw.key,
    source: raw.source,
    sourceId: raw.sourceId,
    url: raw.url,
    title: raw.title,
    imageUrl: raw.imageUrl ?? null,
    line1: raw.line1 ?? null,
    service: raw.service ?? null,
    detail: raw.detail ?? null,
    status: raw.status ?? "saved",
    miles: raw.miles ?? parseMilesFromDetail(raw.detail),
    quotes: raw.quotes ?? parseQuotesFromDetail(raw.detail),
    actualBid: raw.actualBid ?? null,
    notes: raw.notes ?? null,
    savedAt: raw.savedAt ?? Date.now(),
    wonAt: raw.wonAt ?? null,
    completedAt: raw.completedAt ?? null,
  };
}

function parseMilesFromDetail(detail: string | null | undefined): number | null {
  if (!detail) return null;
  const m = detail.match(/(\d+)\s*mi\b/i);
  return m ? Number.parseInt(m[1]!, 10) : null;
}

function parseQuotesFromDetail(detail: string | null | undefined): number | null {
  if (!detail) return null;
  const m = detail.match(/(\d+)\s*quotes?\b/i);
  return m ? Number.parseInt(m[1]!, 10) : null;
}

function migrateLegacyV1(): FavouriteItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LEGACY_V1_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LegacyFavourite[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((j) => ({
      ...shiplyFavourite(j),
      savedAt: j.savedAt ?? Date.now(),
      wonAt: null,
      completedAt: null,
    }));
  } catch {
    return [];
  }
}

function migrateFromStorage(): FavouriteItem[] {
  if (typeof window === "undefined") return [];
  try {
    const v2 = window.localStorage.getItem(LEGACY_V2_KEY);
    if (v2) {
      const parsed = JSON.parse(v2) as LegacyV2Favourite[];
      if (Array.isArray(parsed)) {
        const migrated = parsed.map(normalizeItem);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        window.localStorage.removeItem(LEGACY_V2_KEY);
        window.localStorage.removeItem(LEGACY_V1_KEY);
        return migrated;
      }
    }
    const v1 = migrateLegacyV1();
    if (v1.length > 0) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(v1));
      window.localStorage.removeItem(LEGACY_V1_KEY);
      return v1;
    }
    return [];
  } catch {
    return [];
  }
}

export function readLocalFavourites(): FavouriteItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return migrateFromStorage();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as LegacyV2Favourite[]).map(normalizeItem);
  } catch {
    return [];
  }
}

export function writeLocalFavourites(list: FavouriteItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(FAVOURITES_EVENT));
  } catch {
    // Ignore quota / private-mode errors.
  }
}

export function sortFavourites(list: FavouriteItem[]): FavouriteItem[] {
  return [...list].sort((a, b) => {
    const aTime = a.status === "completed" ? (a.completedAt ?? a.savedAt) : a.status === "won" ? (a.wonAt ?? a.savedAt) : a.savedAt;
    const bTime = b.status === "completed" ? (b.completedAt ?? b.savedAt) : b.status === "won" ? (b.wonAt ?? b.savedAt) : b.savedAt;
    return bTime - aTime;
  });
}

/** Drop client-only timestamps to get the server-persistable shape. */
export function toFavouriteInput(item: FavouriteItem): FavouriteInput {
  return {
    key: item.key,
    source: item.source,
    sourceId: item.sourceId,
    url: item.url,
    title: item.title,
    imageUrl: item.imageUrl,
    line1: item.line1,
    service: item.service,
    detail: item.detail,
    status: item.status,
    miles: item.miles,
    quotes: item.quotes,
    actualBid: item.actualBid,
    notes: item.notes,
    savedAt: item.savedAt,
    wonAt: item.wonAt,
    completedAt: item.completedAt,
  };
}

export function activeJobCount(list: FavouriteItem[]): number {
  return list.filter((j) => j.status === "saved" || j.status === "won").length;
}
