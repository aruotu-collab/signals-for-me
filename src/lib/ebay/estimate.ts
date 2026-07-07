import { extractOutcode, haversineMiles, resolveOutcodes } from "@/lib/shiply/geo";
import { assignPickupHub } from "@/lib/shiply/hubs";
import { isEbayApiConfigured } from "@/lib/ebay/client";
import { getEbayItem } from "@/lib/ebay/search";
import { parseEbayItemId } from "@/lib/ebay/types";

export type DeliveryEstimateInput = {
  ebayUrl: string;
  deliveryPostcode: string;
  pickupPostcode?: string;
};

export type DeliveryEstimateResult = {
  itemId: string | null;
  itemTitle: string | null;
  imageUrl: string | null;
  ebayUrl: string;
  buyingType: string | null;
  apiConnected: boolean;
  pickupPostcode: string | null;
  pickupTown: string | null;
  pickupHub: string | null;
  pickupArea: string | null;
  deliveryArea: string;
  distanceMiles: number | null;
  estimateLow: number | null;
  estimateHigh: number | null;
  message: string;
};

function estimatePriceRange(miles: number): { low: number; high: number } {
  const base = 35;
  const perMile = 0.55;
  const low = Math.round(base + miles * perMile * 0.85);
  const high = Math.round(base + miles * perMile * 1.35);
  return { low: Math.max(low, 25), high: Math.max(high, low + 15) };
}

function buyingTypeLabel(opts?: string[]): string | null {
  if (!opts?.length) return null;
  if (opts.includes("AUCTION")) return "Auction";
  if (opts.includes("BEST_OFFER")) return "Best offer";
  if (opts.includes("FIXED_PRICE")) return "Buy it now";
  return opts[0] ?? null;
}

export async function estimateDelivery(input: DeliveryEstimateInput): Promise<DeliveryEstimateResult> {
  const ebayUrl = input.ebayUrl.trim();
  const itemId = parseEbayItemId(ebayUrl);
  const deliveryOutcode = extractOutcode(input.deliveryPostcode);

  const empty = (message: string): DeliveryEstimateResult => ({
    itemId,
    itemTitle: null,
    imageUrl: null,
    ebayUrl,
    buyingType: null,
    apiConnected: isEbayApiConfigured(),
    pickupPostcode: null,
    pickupTown: null,
    pickupHub: null,
    pickupArea: null,
    deliveryArea: deliveryOutcode ?? input.deliveryPostcode,
    distanceMiles: null,
    estimateLow: null,
    estimateHigh: null,
    message,
  });

  if (!itemId) {
    return empty("Could not read an eBay item ID from that URL. Paste a full ebay.co.uk item link.");
  }

  let pickupPostcode = input.pickupPostcode?.trim() || null;
  let itemTitle: string | null = null;
  let imageUrl: string | null = null;
  let buyingType: string | null = null;
  let pickupTown: string | null = null;

  if (isEbayApiConfigured()) {
    const item = await getEbayItem(itemId);
    if (item) {
      itemTitle = item.title ?? null;
      imageUrl = item.image?.imageUrl ?? null;
      buyingType = buyingTypeLabel(item.buyingOptions);
      pickupTown = item.itemLocation?.city ?? null;
      pickupPostcode = pickupPostcode ?? item.itemLocation?.postalCode ?? null;
    }
  }

  const pickupOutcode = pickupPostcode ? extractOutcode(pickupPostcode) : null;

  if (pickupOutcode && deliveryOutcode) {
    const coords = await resolveOutcodes([pickupOutcode, deliveryOutcode]);
    const from = coords.get(pickupOutcode);
    const to = coords.get(deliveryOutcode);
    if (from && to) {
      const distanceMiles = Math.round(haversineMiles(from, to));
      const range = estimatePriceRange(distanceMiles);
      const hub = assignPickupHub({
        pickupTown: pickupTown ?? pickupPostcode ?? pickupOutcode,
        pickupKey: pickupOutcode,
        pickupAddress: pickupPostcode,
        pickupLat: from.lat,
        pickupLng: from.lng,
      });
      return {
        itemId,
        itemTitle,
        imageUrl,
        ebayUrl,
        buyingType,
        apiConnected: isEbayApiConfigured(),
        pickupPostcode,
        pickupTown,
        pickupHub: hub,
        pickupArea: hub === "Other UK" ? pickupOutcode : `${hub} (${pickupOutcode})`,
        deliveryArea: deliveryOutcode,
        distanceMiles,
        estimateLow: range.low,
        estimateHigh: range.high,
        message: itemTitle
          ? `Instant estimate for “${itemTitle}” — ${distanceMiles} miles from ${hub} to ${deliveryOutcode}.`
          : `Instant estimate — ${distanceMiles} miles from ${pickupOutcode} to ${deliveryOutcode}.`,
      };
    }
  }

  return {
    ...empty(
      isEbayApiConfigured()
        ? "Could not resolve postcodes. Enter the item pickup postcode if eBay did not provide one."
        : "Enter the item pickup postcode for a distance estimate.",
    ),
    itemTitle,
    imageUrl,
    buyingType,
    pickupPostcode,
    pickupTown,
  };
}
