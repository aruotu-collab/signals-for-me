// Shared favourite types, source adapters and localStorage helpers.
// The React state/sync layer lives in components/FavouritesProvider.tsx.

export type FavouriteSource = "shiply" | "ebay";

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
  savedAt: number;
};

export type FavouriteInput = Omit<FavouriteItem, "savedAt">;

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
};

export function ebayFavourite(listing: EbayListingLike): FavouriteInput {
  const loc = listing.subArea ? `${listing.pickupHub} · ${listing.subArea}` : listing.pickupHub;
  const detailParts: string[] = [listing.buyingType];
  if (listing.price != null) {
    detailParts.push(`${listing.currency === "GBP" || !listing.currency ? "£" : ""}${listing.price}`);
  }
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
  };
}

// ---- localStorage layer ------------------------------------------------------

export const STORAGE_KEY = "sfm.favourites.v2";
export const FAVOURITES_EVENT = "sfm-favourites-changed";
const LEGACY_KEY = "sfm.favourites.v1";

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

function migrateLegacy(): FavouriteItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LEGACY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LegacyFavourite[];
    if (!Array.isArray(parsed)) return [];
    const migrated = parsed.map((j) => ({
      ...shiplyFavourite(j),
      savedAt: j.savedAt ?? Date.now(),
    }));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    window.localStorage.removeItem(LEGACY_KEY);
    return migrated;
  } catch {
    return [];
  }
}

export function readLocalFavourites(): FavouriteItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return migrateLegacy();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as FavouriteItem[]) : [];
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
  return [...list].sort((a, b) => b.savedAt - a.savedAt);
}

/** Drop the client-only savedAt timestamp to get the server-persistable shape. */
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
  };
}
