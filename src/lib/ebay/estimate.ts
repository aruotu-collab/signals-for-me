import { extractOutcode, haversineMiles, resolveOutcodes } from "@/lib/shiply/geo";
import { isEbayApiConfigured, parseEbayItemId } from "@/lib/ebay/mock";

export type DeliveryEstimateInput = {
  ebayUrl: string;
  deliveryPostcode: string;
  /** Optional until eBay API returns item location */
  pickupPostcode?: string;
};

export type DeliveryEstimateResult = {
  itemId: string | null;
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
  const pickupOutcode = input.pickupPostcode ? extractOutcode(input.pickupPostcode) : null;

  if (!itemId) {
    return {
      itemId: null,
      apiConnected: isEbayApiConfigured(),
      pickupArea: null,
      deliveryArea: input.deliveryPostcode,
      distanceMiles: null,
      estimateLow: null,
      estimateHigh: null,
      message: "Could not read an eBay item ID from that URL. Paste a full ebay.co.uk item link.",
    };
  }

  if (!isEbayApiConfigured()) {
    if (pickupOutcode && deliveryOutcode) {
      const coords = await resolveOutcodes([pickupOutcode, deliveryOutcode]);
      const from = coords.get(pickupOutcode);
      const to = coords.get(deliveryOutcode);
      if (from && to) {
        const distanceMiles = Math.round(haversineMiles(from, to));
        const range = estimatePriceRange(distanceMiles);
        return {
          itemId,
          apiConnected: false,
          pickupArea: pickupOutcode,
          deliveryArea: deliveryOutcode,
          distanceMiles,
          estimateLow: range.low,
          estimateHigh: range.high,
          message:
            "Draft estimate from postcodes you entered. Connect the eBay Browse API to auto-fill pickup location from the listing.",
        };
      }
    }

    return {
      itemId,
      apiConnected: false,
      pickupArea: pickupOutcode,
      deliveryArea: deliveryOutcode ?? input.deliveryPostcode,
      distanceMiles: null,
      estimateLow: null,
      estimateHigh: null,
      message:
        "eBay API not connected yet. Add EBAY_CLIENT_ID and EBAY_CLIENT_SECRET to auto-read item location — or enter the item pickup postcode below for a draft estimate.",
    };
  }

  // Future: call eBay Browse API getItem, read itemLocation, then estimate.
  return {
    itemId,
    apiConnected: true,
    pickupArea: null,
    deliveryArea: deliveryOutcode ?? input.deliveryPostcode,
    distanceMiles: null,
    estimateLow: null,
    estimateHigh: null,
    message: "eBay API credentials found — live item lookup will be wired in the next step.",
  };
}
