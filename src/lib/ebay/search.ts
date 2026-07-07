import { assignPickupHub } from "@/lib/shiply/hubs";
import { ebayBrowse } from "@/lib/ebay/client";
import type { BuyingType, EbayListing } from "@/lib/ebay/types";

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
  Furniture: "furniture sofa wardrobe table",
  Antiques: "antique vintage",
  Cars: "car",
  Motorcycles: "motorcycle motorbike",
  Pianos: "piano",
  Haulage: "pallet industrial",
  Pets: "dog crate kennel",
  Garden: "garden furniture shed",
  Machinery: "machinery tools",
};

// eBay UK top-level category IDs for tighter targeting (optional; keyword still applied).
// See https://www.isoldwhat.com / eBay category tree. These are stable top-level IDs.
const CATEGORY_IDS: Record<string, string> = {
  Furniture: "3197", // Home, Furniture & DIY > Furniture
  Antiques: "20081", // Antiques
  Cars: "9800", // Cars, Motorcycles & Vehicles > Cars
  Motorcycles: "6024", // Motorcycles
  Pianos: "16218", // Musical Instruments > Pianos, Keyboards & Organs
  Haulage: "12576", // Business, Office & Industrial
  Pets: "1281", // Pet Supplies
  Garden: "159912", // Garden & Patio
  Machinery: "11804", // Business & Industrial > Industrial tools
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

function buyingTypeOf(item: EbayItemSummary): BuyingType {
  const opts = item.buyingOptions ?? [];
  if (opts.includes("AUCTION")) return "Auction";
  if (opts.includes("BEST_OFFER")) return "Best offer";
  return "Buy it now";
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
  const buyingType = buyingTypeOf(item);
  const priceStr = item.currentBidPrice?.value ?? item.price?.value;
  const currency = item.currentBidPrice?.currency ?? item.price?.currency ?? "GBP";

  return {
    id: item.itemId,
    title: item.title,
    category,
    serviceType: SERVICE_TYPE_BY_CATEGORY[category] ?? "Deliveries",
    pickupHub,
    subArea: pickupKey,
    // Only auctions have a meaningful end time.
    endsAt: buyingType === "Auction" ? item.itemEndDate ?? null : null,
    buyingType,
    price: priceStr ? Number.parseFloat(priceStr) : null,
    currency,
    imageUrl: item.image?.imageUrl ?? null,
    ebayUrl: item.itemAffiliateWebUrl ?? item.itemWebUrl ?? `https://www.ebay.co.uk/itm/${item.itemId}`,
    collectionOnly: true,
  };
}

async function searchHub(
  hub: string,
  postcode: string,
  q: string,
  categoryId: string | null,
  limit = 20,
): Promise<EbayListing[]> {
  // Collection-only is defined by local pickup — NOT by auction. Include all
  // buying options so Buy-It-Now and Best-Offer collection items appear too.
  const filters = [
    "buyingOptions:{AUCTION|FIXED_PRICE|BEST_OFFER}",
    "deliveryOptions:{SELLER_ARRANGED_LOCAL_PICKUP}",
    "pickupCountry:GB",
    `pickupPostalCode:${postcode.replace(/\s+/g, "")}`,
    "pickupRadius:40",
    "pickupRadiusUnit:mi",
  ].join(",");

  const params = new URLSearchParams({
    q,
    limit: String(limit),
    filter: filters,
  });
  if (categoryId) params.set("category_ids", categoryId);

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
  const q = category ? (CATEGORY_KEYWORDS[category] ?? category) : "collection only";
  const categoryId = category ? CATEGORY_IDS[category] ?? null : null;

  const limitPerHub = opts?.limitPerHub ?? 12;
  const seen = new Set<string>();
  const listings: EbayListing[] = [];

  for (const seed of HUB_SEED_POSTCODES) {
    try {
      const batch = await searchHub(seed.hub, seed.postcode, q, categoryId, limitPerHub);
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
