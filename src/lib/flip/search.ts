import { ebayBrowse } from "@/lib/ebay/client";
import { toAffiliateEbayUrl } from "@/lib/ebay/affiliate";
import type { EbayItemSummary } from "@/lib/ebay/search";
import type { FlipCategory } from "@/lib/flip/types";
import { compsQuery, WATCH_SEARCH_BRANDS } from "@/lib/flip/market";

type EbaySearchResponse = {
  itemSummaries?: EbayItemSummary[];
  total?: number;
};

/** eBay UK category IDs for flip verticals. */
export const FLIP_CATEGORY_IDS: Record<Exclude<FlipCategory, "all">, string> = {
  Watches: "31387", // Jewellery & Watches > Watches
  Phones: "9355", // Mobile Phones & Communication > Mobile & Smart Phones
  Laptops: "175672", // Computers/Tablets & Networking > Laptops & Netbooks
};

const PHONE_SEARCH_QUERIES = [
  "iPhone 15",
  "iPhone 14",
  "iPhone 13",
  "Samsung Galaxy S24",
  "Samsung Galaxy S23",
  "Google Pixel",
];
const LAPTOP_SEARCH_QUERIES = ["MacBook Pro", "MacBook Air", "ThinkPad", "Dell XPS", "Surface Laptop"];

export type FlipAuctionItem = {
  id: string;
  title: string;
  category: Exclude<FlipCategory, "all">;
  imageUrl: string | null;
  ebayUrl: string;
  location: string | null;
  buyingType: "Auction" | "Buy it now" | "Best offer";
  currentPrice: number;
  currency: string;
  endsAt: string | null;
};

function buyingTypeOf(item: EbayItemSummary): FlipAuctionItem["buyingType"] {
  const opts = item.buyingOptions ?? [];
  if (opts.includes("AUCTION")) return "Auction";
  if (opts.includes("BEST_OFFER")) return "Best offer";
  return "Buy it now";
}

function toItem(item: EbayItemSummary, category: Exclude<FlipCategory, "all">): FlipAuctionItem | null {
  if (!item.itemId || !item.title) return null;
  const priceStr = item.currentBidPrice?.value ?? item.price?.value;
  const price = priceStr ? Number.parseFloat(priceStr) : NaN;
  if (!Number.isFinite(price) || price <= 0) return null;

  const city = item.itemLocation?.city?.trim() || null;
  const postcode = item.itemLocation?.postalCode?.trim() || null;
  const location = [city, postcode].filter(Boolean).join(", ") || null;

  const rawUrl = item.itemAffiliateWebUrl ?? item.itemWebUrl ?? `https://www.ebay.co.uk/itm/${item.itemId}`;

  return {
    id: item.itemId,
    title: item.title,
    category,
    imageUrl: item.image?.imageUrl ?? null,
    ebayUrl: toAffiliateEbayUrl(rawUrl, `flip-${category.toLowerCase()}`),
    location,
    buyingType: buyingTypeOf(item),
    currentPrice: price,
    currency: item.currentBidPrice?.currency ?? item.price?.currency ?? "GBP",
    endsAt: item.itemEndDate ?? null,
  };
}

async function searchAuctions(opts: {
  category: Exclude<FlipCategory, "all">;
  q?: string;
  limit?: number;
}): Promise<FlipAuctionItem[]> {
  const limit = Math.min(opts.limit ?? 20, 50);
  const categoryId = FLIP_CATEGORY_IDS[opts.category];

  const filters = ["buyingOptions:{AUCTION}", "itemLocationCountry:GB", "price:[5..20000]"].join(",");

  const params = new URLSearchParams({
    limit: String(limit),
    category_ids: categoryId,
    filter: filters,
    sort: "endingSoonest",
  });
  if (opts.q) params.set("q", opts.q);

  const data = await ebayBrowse<EbaySearchResponse>(`/buy/browse/v1/item_summary/search?${params}`);
  return (data.itemSummaries ?? [])
    .map((item) => toItem(item, opts.category))
    .filter((x): x is FlipAuctionItem => Boolean(x));
}

function queriesFor(category: Exclude<FlipCategory, "all">): string[] {
  if (category === "Watches") return [...WATCH_SEARCH_BRANDS];
  if (category === "Phones") return PHONE_SEARCH_QUERIES;
  return LAPTOP_SEARCH_QUERIES;
}

/**
 * Prefer brand/model queries over a raw ending-soon dump — otherwise the feed
 * fills with job lots and "spares or repair" junk that ends in the next minute.
 */
export async function searchEndingAuctions(opts: {
  category: Exclude<FlipCategory, "all">;
  limit?: number;
}): Promise<FlipAuctionItem[]> {
  const queries = queriesFor(opts.category);
  const perQuery = opts.category === "Watches" ? 8 : 10;
  const seen = new Set<string>();
  const out: FlipAuctionItem[] = [];

  const batches = await Promise.all(
    queries.map((q) =>
      searchAuctions({ category: opts.category, q, limit: perQuery }).catch(() => [] as FlipAuctionItem[]),
    ),
  );

  for (const batch of batches) {
    for (const item of batch) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      out.push(item);
    }
  }

  try {
    const general = await searchAuctions({ category: opts.category, limit: opts.limit ?? 15 });
    for (const item of general) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      out.push(item);
    }
  } catch {
    // ignore
  }

  return out;
}

/** Active Buy-It-Now comps — used as a soft market-value signal. */
export async function searchBinComps(opts: {
  category: Exclude<FlipCategory, "all">;
  title: string;
  brand: string | null;
  limit?: number;
}): Promise<number[]> {
  const q = compsQuery(opts.title, opts.brand);
  if (!q || q.length < 3) return [];

  const filters = [
    "buyingOptions:{FIXED_PRICE}",
    "itemLocationCountry:GB",
    "price:[10..20000]",
    "conditions:{3000|4000|5000}",
  ].join(",");

  const params = new URLSearchParams({
    q,
    limit: String(opts.limit ?? 8),
    category_ids: FLIP_CATEGORY_IDS[opts.category],
    filter: filters,
    sort: "price",
  });

  try {
    const data = await ebayBrowse<EbaySearchResponse>(`/buy/browse/v1/item_summary/search?${params}`);
    const prices: number[] = [];
    for (const item of data.itemSummaries ?? []) {
      const v = item.price?.value ? Number.parseFloat(item.price.value) : NaN;
      if (Number.isFinite(v) && v > 0) prices.push(v);
    }
    return prices;
  } catch {
    return [];
  }
}

export function median(nums: number[]): number | null {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}
