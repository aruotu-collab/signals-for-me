import { extractOutcode, haversineMiles, resolveOutcodes } from "@/lib/shiply/geo";
import { assignPickupHub } from "@/lib/shiply/hubs";
import { isEbayApiConfigured } from "@/lib/ebay/client";
import { getEbayItem } from "@/lib/ebay/search";
import { parseEbayItemId } from "@/lib/ebay/types";
import { countVansForHub } from "@/lib/ebay/emptyVans";
import { deliveryGuideRange } from "@/lib/ebay/quoteIntel";

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
  itemPrice: number | null;
  auctionEndsAt: string | null;
  apiConnected: boolean;
  pickupPostcode: string | null;
  pickupTown: string | null;
  pickupHub: string | null;
  pickupArea: string | null;
  deliveryArea: string;
  distanceMiles: number | null;
  estimateLow: number | null;
  estimateHigh: number | null;
  serviceCategory: string | null;
  driversNearby: number;
  message: string;
};

function buyingTypeLabel(opts?: string[]): string | null {
  if (!opts?.length) return null;
  if (opts.includes("AUCTION")) return "Auction";
  if (opts.includes("BEST_OFFER")) return "Best offer";
  if (opts.includes("FIXED_PRICE")) return "Buy it now";
  return opts[0] ?? null;
}

function emptyResult(
  ebayUrl: string,
  itemId: string | null,
  deliveryArea: string,
  message: string,
): DeliveryEstimateResult {
  return {
    itemId,
    itemTitle: null,
    imageUrl: null,
    ebayUrl,
    buyingType: null,
    itemPrice: null,
    auctionEndsAt: null,
    apiConnected: isEbayApiConfigured(),
    pickupPostcode: null,
    pickupTown: null,
    pickupHub: null,
    pickupArea: null,
    deliveryArea,
    distanceMiles: null,
    estimateLow: null,
    estimateHigh: null,
    serviceCategory: null,
    driversNearby: 0,
    message,
  };
}

export async function estimateDelivery(input: DeliveryEstimateInput): Promise<DeliveryEstimateResult> {
  const ebayUrl = input.ebayUrl.trim();
  const itemId = parseEbayItemId(ebayUrl);
  const deliveryOutcode = extractOutcode(input.deliveryPostcode);

  const empty = (message: string) => emptyResult(ebayUrl, itemId, deliveryOutcode ?? input.deliveryPostcode, message);

  if (!itemId) {
    return empty("Could not read an eBay item ID from that URL. Paste a full ebay.co.uk item link.");
  }

  let pickupPostcode = input.pickupPostcode?.trim() || null;
  let itemTitle: string | null = null;
  let imageUrl: string | null = null;
  let buyingType: string | null = null;
  let pickupTown: string | null = null;
  let itemPrice: number | null = null;
  let auctionEndsAt: string | null = null;

  if (isEbayApiConfigured()) {
    const item = await getEbayItem(itemId);
    if (item) {
      itemTitle = item.title ?? null;
      imageUrl = item.image?.imageUrl ?? null;
      buyingType = buyingTypeLabel(item.buyingOptions);
      pickupTown = item.itemLocation?.city ?? null;
      pickupPostcode = pickupPostcode ?? item.itemLocation?.postalCode ?? null;
      const priceStr = item.currentBidPrice?.value ?? item.price?.value;
      itemPrice = priceStr ? Number.parseFloat(priceStr) : null;
      auctionEndsAt = item.itemEndDate ?? null;
    }
  }

  const pickupOutcode = pickupPostcode ? extractOutcode(pickupPostcode) : null;

  if (pickupOutcode && deliveryOutcode) {
    const coords = await resolveOutcodes([pickupOutcode, deliveryOutcode]);
    const from = coords.get(pickupOutcode);
    const to = coords.get(deliveryOutcode);
    if (from && to) {
      const distanceMiles = Math.round(haversineMiles(from, to));
      const range = deliveryGuideRange(distanceMiles, itemTitle);
      const hub = assignPickupHub({
        pickupTown: pickupTown ?? pickupPostcode ?? pickupOutcode,
        pickupKey: pickupOutcode,
        pickupAddress: pickupPostcode,
        pickupLat: from.lat,
        pickupLng: from.lng,
      });
      const driversNearby = await countVansForHub(hub);
      return {
        itemId,
        itemTitle,
        imageUrl,
        ebayUrl,
        buyingType,
        itemPrice,
        auctionEndsAt,
        apiConnected: isEbayApiConfigured(),
        pickupPostcode,
        pickupTown,
        pickupHub: hub,
        pickupArea: hub === "Other UK" ? pickupOutcode : `${hub} (${pickupOutcode})`,
        deliveryArea: deliveryOutcode,
        distanceMiles,
        estimateLow: range.low,
        estimateHigh: range.high,
        serviceCategory: range.category,
        driversNearby,
        message: itemTitle
          ? `Instant estimate for “${itemTitle}” — ${distanceMiles} mi · ${range.category} · guide £${range.low}–£${range.high}.`
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
    itemPrice,
    auctionEndsAt,
    pickupPostcode,
    pickupTown,
  };
}
