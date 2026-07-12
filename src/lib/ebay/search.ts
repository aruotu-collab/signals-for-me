import { assignPickupHub } from "@/lib/shiply/hubs";
import { ebayBrowse } from "@/lib/ebay/client";
import { toAffiliateEbayUrl } from "@/lib/ebay/affiliate";
import type { BuyingType, EbayListing } from "@/lib/ebay/types";

export type EbayItemSummary = {
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

// eBay UK (EBAY_GB, category tree 3) category IDs — verified via the Taxonomy API
// (get_category_suggestions). We use these as the PRIMARY constraint so that only
// the actual bulky goods appear: manuals, parts, stickers and merch live in
// separate categories (e.g. Vehicle Parts & Accessories) and are excluded outright.
const CATEGORY_IDS: Record<string, string> = {
  Furniture: "3197", // Home, Furniture & DIY > Furniture
  Antiques: "20081", // Antiques
  Cars: "9801", // Cars, Motorcycles & Vehicles > Cars
  Motorcycles: "422", // Cars, Motorcycles & Vehicles > Motorcycles & Scooters
  Pianos: "181225", // Musical Instruments > Pianos, Keyboards & Organs > Pianos
  Haulage: "26221", // Business, Office & Industrial > Material Handling
  Pets: "1281", // Pet Supplies
  Garden: "159912", // Garden & Patio
  Machinery: "12576", // Business, Office & Industrial
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

function toListing(item: EbayItemSummary, hubOverride?: string, categoryOverride?: string): EbayListing | null {
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

  // When we searched a known eBay category, trust it for bucketing — many valid
  // listings (e.g. "Honda CBR600") have no category word in the title.
  const category = categoryOverride ?? inferCategory(item);
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
    ebayUrl: toAffiliateEbayUrl(
      item.itemAffiliateWebUrl ?? item.itemWebUrl ?? `https://www.ebay.co.uk/itm/${item.itemId}`,
      `jobs-${category}`,
    ),
    collectionOnly: true,
  };
}

async function searchHub(opts: {
  hub: string;
  postcode: string;
  categoryLabel: string | null;
  categoryId: string | null;
  q: string | null;
  limit: number;
}): Promise<EbayListing[]> {
  const { hub, postcode, categoryLabel, categoryId, q, limit } = opts;

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

  const params = new URLSearchParams({ limit: String(limit), filter: filters });
  // Category ID is the precise constraint (keeps out manuals/parts/merch). Only
  // fall back to a keyword query when we have no category to target.
  if (categoryId) params.set("category_ids", categoryId);
  if (q) params.set("q", q);

  const data = await ebayBrowse<EbaySearchResponse>(`/buy/browse/v1/item_summary/search?${params}`);
  return (data.itemSummaries ?? [])
    .map((item) => toListing(item, hub, categoryLabel ?? undefined))
    .filter(Boolean) as EbayListing[];
}

async function searchCategoryAcrossHubs(
  categoryLabel: string,
  limitPerHub: number,
): Promise<EbayListing[]> {
  const categoryId = CATEGORY_IDS[categoryLabel] ?? null;
  // With a valid category ID we omit the keyword entirely; the category alone is
  // far more precise. If we somehow lack an ID, fall back to keyword targeting.
  const q = categoryId ? null : CATEGORY_KEYWORDS[categoryLabel] ?? categoryLabel;

  const batches = await Promise.all(
    HUB_SEED_POSTCODES.map((seed) =>
      searchHub({ hub: seed.hub, postcode: seed.postcode, categoryLabel, categoryId, q, limit: limitPerHub }).catch(
        () => [] as EbayListing[],
      ),
    ),
  );
  return batches.flat();
}

export async function searchCollectionOnlyListings(opts?: { category?: string; limitPerHub?: number }): Promise<{
  listings: EbayListing[];
  source: "live" | "mock";
}> {
  const category = opts?.category && opts.category !== "all" ? opts.category : null;
  const limitPerHub = opts?.limitPerHub ?? 12;

  // For a specific category, search only that one. For "all", sweep every bulky
  // category so the matrix is populated by real goods — not a fuzzy keyword.
  const categoriesToSearch = category ? [category] : [...EBAY_CATEGORIES];
  const perHub = category ? limitPerHub : Math.max(4, Math.round(limitPerHub / 2));

  const seen = new Set<string>();
  const listings: EbayListing[] = [];

  for (const cat of categoriesToSearch) {
    try {
      const batch = await searchCategoryAcrossHubs(cat, perHub);
      for (const item of batch) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        listings.push(item);
      }
    } catch {
      // Continue other categories if one sweep fails (quota, radius, etc.)
    }
  }

  return { listings, source: "live" };
}

export async function getEbayItem(itemId: string): Promise<EbayItemSummary | null> {
  // eBay Browse has two item endpoints:
  //   - /item/{RESTful-id}          for IDs like "v1|123|0"
  //   - /item/get_item_by_legacy_id for legacy numeric IDs (what item URLs use)
  // Buyer-pasted URLs give a legacy numeric ID, so try that first.
  const isLegacyNumeric = /^\d{6,}$/.test(itemId);

  if (isLegacyNumeric) {
    try {
      const data = await ebayBrowse<EbayItemSummary>(
        `/buy/browse/v1/item/get_item_by_legacy_id?legacy_item_id=${encodeURIComponent(itemId)}`,
      );
      if (data?.itemId) return data;
    } catch {
      // Fall through to the RESTful endpoint below.
    }
  }

  try {
    const data = await ebayBrowse<EbayItemSummary>(`/buy/browse/v1/item/${encodeURIComponent(itemId)}`);
    return data;
  } catch {
    return null;
  }
}

export { CATEGORY_KEYWORDS };
export const EBAY_CATEGORIES = Object.keys(CATEGORY_KEYWORDS);
