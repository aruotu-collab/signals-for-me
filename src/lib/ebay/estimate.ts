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
  apiConnected: boolean;
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

export async function estimateDelivery(input: DeliveryEstimateInput): Promise<DeliveryEstimateResult> {
  const itemId = parseEbayItemId(input.ebayUrl.trim());
  const deliveryOutcode = extractOutcode(input.deliveryPostcode);

  if (!itemId) {
    return {
      itemId: null,
      itemTitle: null,
      apiConnected: isEbayApiConfigured(),
      pickupArea: null,
      deliveryArea: input.deliveryPostcode,
      distanceMiles: null,
      estimateLow: null,
      estimateHigh: null,
      message: "Could not read an eBay item ID from that URL. Paste a full ebay.co.uk item link.",
    };
  }

  let pickupPostcode = input.pickupPostcode?.trim() || null;
  let itemTitle: string | null = null;

  if (isEbayApiConfigured()) {
    const item = await getEbayItem(itemId);
    if (item) {
      itemTitle = item.title ?? null;
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
        pickupTown: pickupPostcode ?? pickupOutcode,
        pickupKey: pickupOutcode,
        pickupAddress: pickupPostcode,
        pickupLat: from.lat,
        pickupLng: from.lng,
      });
      return {
        itemId,
        itemTitle,
        apiConnected: isEbayApiConfigured(),
        pickupArea: hub === "Other UK" ? pickupOutcode : `${hub} (${pickupOutcode})`,
        deliveryArea: deliveryOutcode,
        distanceMiles,
        estimateLow: range.low,
        estimateHigh: range.high,
        message: itemTitle
          ? `Estimate for “${itemTitle}” — collection from ${hub}, delivery to ${deliveryOutcode}.`
          : `Draft estimate from pickup ${pickupOutcode} to delivery ${deliveryOutcode}.`,
      };
    }
  }

  return {
    itemId,
    itemTitle,
    apiConnected: isEbayApiConfigured(),
    pickupArea: pickupPostcode,
    deliveryArea: deliveryOutcode ?? input.deliveryPostcode,
    distanceMiles: null,
    estimateLow: null,
    estimateHigh: null,
    message: isEbayApiConfigured()
      ? "Could not resolve postcodes for distance. Check the item has a UK pickup location, or enter the pickup postcode manually."
      : "Add eBay API keys to auto-read pickup location — or enter the item pickup postcode for a draft estimate.",
  };
}
