import { extractOutcode, geocodePlaceName, haversineMiles, resolveOutcodes } from "@/lib/shiply/geo";
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

  // Resolve pickup + delivery coordinates from postcodes first, then fall back
  // to geocoding the eBay town name (e.g. "Sunbury-on-Thames") when eBay only
  // gives a place, not a postcode.
  const outcodeCoords = await resolveOutcodes(
    [pickupOutcode, deliveryOutcode].filter((c): c is string => Boolean(c)),
  );

  let from = pickupOutcode ? outcodeCoords.get(pickupOutcode) ?? null : null;
  let pickupResolvedBy: "postcode" | "town" | null = from ? "postcode" : null;
  if (!from) {
    from = await geocodePlaceName(pickupTown ?? pickupPostcode);
    if (from) pickupResolvedBy = "town";
  }

  let to = deliveryOutcode ? outcodeCoords.get(deliveryOutcode) ?? null : null;
  if (!to) {
    to = await geocodePlaceName(input.deliveryPostcode);
  }

  if (from && to) {
    const distanceMiles = Math.round(haversineMiles(from, to));
    const range = deliveryGuideRange(distanceMiles, itemTitle);
    const hub = assignPickupHub({
      pickupTown: pickupTown ?? pickupPostcode ?? pickupOutcode ?? "Pickup",
      pickupKey: pickupOutcode ?? pickupTown ?? "Pickup",
      pickupAddress: pickupPostcode ?? pickupTown,
      pickupLat: from.lat,
      pickupLng: from.lng,
    });
    const driversNearby = await countVansForHub(hub);
    const pickupLabel = pickupOutcode ?? pickupTown ?? hub;
    const deliveryLabel = deliveryOutcode ?? input.deliveryPostcode;
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
      pickupArea:
        hub === "Other UK"
          ? pickupLabel
          : pickupOutcode
            ? `${hub} (${pickupOutcode})`
            : hub,
      deliveryArea: deliveryLabel,
      distanceMiles,
      estimateLow: range.low,
      estimateHigh: range.high,
      serviceCategory: range.category,
      driversNearby,
      message: itemTitle
        ? `Instant estimate for “${itemTitle}” — ${distanceMiles} mi · ${range.category} · guide £${range.low}–£${range.high}.${
            pickupResolvedBy === "town" ? ` Pickup located from “${pickupTown}”.` : ""
          }`
        : `Instant estimate — ${distanceMiles} miles from ${pickupLabel} to ${deliveryLabel}.`,
    };
  }

  const cannotResolvePickup = !from;
  return {
    ...empty(
      cannotResolvePickup
        ? "Could not locate the item pickup. Enter the item pickup postcode above."
        : "Could not read your delivery postcode. Enter a valid UK postcode.",
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
