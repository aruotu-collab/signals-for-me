import { assignPickupHub } from "@/lib/shiply/hubs";
import { ebayBrowse } from "@/lib/ebay/client";
import type { EbayListing } from "@/lib/ebay/types";

type EbayItemSummary = {
  itemId?: string;
  title?: string;
  itemWebUrl?: string;
  itemAffiliateWebUrl?: string;
  image?: { imageUrl?: string };
  itemLocation?: { city?: string; postalCode?: string; country?: string };
  price?: { value?: string; currency?: string };
  currentBidPrice?: { value?: string; currency?: string };
  itemEndDate?: string;
  buyingOptions?: string[];
  categories?: { categoryName?: string }[];
  localizedAspects?: { name?: string; value?: string }[];
};

type EbaySearchResponse = {
  itemSummaries?: EbayItemSummary[];
  total?: number;
};

const HUB_SEED_POSTCODES: { hub: string; postcode: string }[] = [
  { hub: "London", postcode: "SW1A1AA" },
  { hub: "Manchester", postcode: "M1 1AE" },
  { hub: "Birmingham", postcode: "B1 1BB" },
  { hub: "Leeds", postcode: "LS1 1UR" },
  { hub: "Glasgow", postcode: "G1 1AA" },
  { hub: "Bristol", postcode: "BS1 4ST" },
  { hub: "Liverpool", postcode: "L1 8JQ" },
  { hub: "Newcastle", postcode: "NE1 7RU" },
  { hub: "Sheffield", postcode: "S1 2HH" },
  { hub: "Nottingham", postcode: "NG1 5DT" },
];

const CATEGORY_KEYWORDS: Record<string, string> = {
  Furniture: "furniture sofa wardrobe table collection",
  Antiques: "antique vintage collection",
  Cars: "car vehicle collection",
  Motorcycles: "motorcycle motorbike collection",
  Pianos: "piano collection",
  Haulage: "pallet machinery industrial collection",
  Pets: "dog crate kennel collection",
  Garden: "garden furniture shed collection",
  Machinery: "machinery tools collection",
};

const SERVICE_TYPE_BY_CATEGORY: Record<string, string> = {
  Furniture: "Deliveries",
  Antiques: "Deliveries",
  Garden: "Deliveries",
  Pianos: "Deliveries",
  Machinery: "Haulage",
  Haulage: "Haulage",
  Cars: "Vehicle Deliveries",
  Motorcycles: "Vehicle Deliveries",
  Pets: "Pets & Livestock",
};

function inferCategory(item: EbayItemSummary): string {
  const ebayCat = item.categories?.[0]?.categoryName?.toLowerCase() ?? "";
  const title = (item.title ?? "").toLowerCase();
  const blob = `${ebayCat} ${title}`;

  if (/\b(car|vehicle|van|camper)\b/.test(blob)) return "Cars";
  if (/\b(motorcycle|motorbike|scooter)\b/.test(blob)) return "Motorcycles";
  if (/\b(piano)\b/.test(blob)) return "Pianos";
  if (/\b(antique|vintage)\b/.test(blob)) return "Antiques";
  if (/\b(sofa|wardrobe|table|bed|furniture|cabinet|dresser)\b/.test(blob)) return "Furniture";
  if (/\b(garden|shed|greenhouse|lawnmower)\b/.test(blob)) return "Garden";
  if (/\b(pallet|forklift|industrial|machinery|lathe)\b/.test(blob)) return "Machinery";
  if (/\b(dog|cat|kennel|crate|horse)\b/.test(blob)) return "Pets";
  return "Furniture";
}

function toListing(item: EbayItemSummary, hubOverride?: string): EbayListing | null {
  if (!item.itemId || !item.title) return null;

  const city = item.itemLocation?.city?.trim() || "Unknown";
  const postcode = item.itemLocation?.postalCode?.trim() || null;
  const pickupKey = postcode ? `${city} ${postcode.split(" ")[0]}` : city;
  const pickupHub =
    hubOverride ??
    assignPickupHub({
      pickupTown: city,
      pickupKey: city,
      pickupAddress: [city, postcode ?? ""].filter(Boolean).join(", "),
    });

  const category = inferCategory(item);
  const bid = item.currentBidPrice?.value ?? item.price?.value;
  const currency = item.currentBidPrice?.currency ?? item.price?.currency ?? "GBP";

  return {
    id: item.itemId,
    title: item.title,
    category,
    serviceType: SERVICE_TYPE_BY_CATEGORY[category] ?? "Deliveries",
    pickupHub,
    subArea: pickupKey,
    endsAt: item.itemEndDate ?? new Date(Date.now() + 86_400_000).toISOString(),
    currentBid: bid ? Number.parseFloat(bid) : null,
    currency,
    imageUrl: item.image?.imageUrl ?? null,
    ebayUrl: item.itemAffiliateWebUrl ?? item.itemWebUrl ?? `https://www.ebay.co.uk/itm/${item.itemId}`,
    collectionOnly: true,
  };
}

async function searchHub(hub: string, postcode: string, q: string, limit = 20): Promise<EbayListing[]> {
  const filters = [
    "buyingOptions:{AUCTION}",
    "deliveryOptions:{SELLER_ARRANGED_LOCAL_PICKUP}",
    "pickupCountry:GB",
    `pickupPostalCode:${postcode.replace(/\s+/g, "")}`,
    "pickupRadius:40",
    "pickupRadiusUnit:mi",
  ].join(",");

  const params = new URLSearchParams({
    q,
    limit: String(limit),
    sort: "endingSoonest",
    filter: filters,
  });

  const data = await ebayBrowse<EbaySearchResponse>(`/buy/browse/v1/item_summary/search?${params}`);
  return (data.itemSummaries ?? [])
    .map((item) => toListing(item, hub))
    .filter(Boolean) as EbayListing[];
}

export async function searchCollectionOnlyListings(opts?: { category?: string; limitPerHub?: number }): Promise<{
  listings: EbayListing[];
  source: "live" | "mock";
}> {
  const category = opts?.category && opts.category !== "all" ? opts.category : null;
  const q = category ? (CATEGORY_KEYWORDS[category] ?? `${category} collection`) : "collection only furniture";

  const limitPerHub = opts?.limitPerHub ?? 12;
  const seen = new Set<string>();
  const listings: EbayListing[] = [];

  for (const seed of HUB_SEED_POSTCODES) {
    try {
      const batch = await searchHub(seed.hub, seed.postcode, q, limitPerHub);
      for (const item of batch) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        listings.push(item);
      }
    } catch {
      // Continue other hubs if one search fails (quota, radius, etc.)
    }
  }

  return { listings, source: "live" };
}

export async function getEbayItem(itemId: string): Promise<EbayItemSummary | null> {
  try {
    const data = await ebayBrowse<EbayItemSummary>(`/buy/browse/v1/item/${encodeURIComponent(itemId)}`);
    return data;
  } catch {
    return null;
  }
}

export { CATEGORY_KEYWORDS };
export const EBAY_CATEGORIES = Object.keys(CATEGORY_KEYWORDS);
