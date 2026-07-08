import { extractOutcode, geocodePlaceName, haversineMiles, resolveOutcodes } from "@/lib/shiply/geo";
import { assignPickupHub } from "@/lib/shiply/hubs";
import { countVansForHub } from "@/lib/ebay/emptyVans";
import { deliveryGuideRangeForService } from "@/lib/ebay/quoteIntel";
import { estimateTravelHours, formatDriveTime } from "@/lib/shiply/intelligence";

export type ManualEstimateInput = {
  itemTitle: string;
  service: string;
  pickupPostcode: string;
  deliveryPostcode: string;
};

export type ManualEstimateResult = {
  itemTitle: string;
  service: string;
  serviceCategory: string;
  pickupPostcode: string;
  pickupTown: string | null;
  pickupHub: string | null;
  deliveryArea: string;
  distanceMiles: number | null;
  driveTimeHours: number | null;
  estimateLow: number | null;
  estimateHigh: number | null;
  driversNearby: number;
  message: string;
};

export async function estimateManualDelivery(input: ManualEstimateInput): Promise<ManualEstimateResult> {
  const itemTitle = input.itemTitle.trim();
  const service = input.service.trim();
  const pickupPostcode = input.pickupPostcode.trim();
  const deliveryPostcode = input.deliveryPostcode.trim();
  const pickupOutcode = extractOutcode(pickupPostcode);
  const deliveryOutcode = extractOutcode(deliveryPostcode);

  const empty = (message: string): ManualEstimateResult => ({
    itemTitle,
    service,
    serviceCategory: service,
    pickupPostcode,
    pickupTown: null,
    pickupHub: null,
    deliveryArea: deliveryOutcode ?? deliveryPostcode,
    distanceMiles: null,
    driveTimeHours: null,
    estimateLow: null,
    estimateHigh: null,
    driversNearby: 0,
    message,
  });

  if (!itemTitle) return empty("Describe what needs moving.");
  if (!service) return empty("Select a category.");
  if (!pickupPostcode || !deliveryPostcode) return empty("Pickup and delivery postcodes are required.");

  const outcodeCoords = await resolveOutcodes(
    [pickupOutcode, deliveryOutcode].filter((c): c is string => Boolean(c)),
  );

  let from = pickupOutcode ? outcodeCoords.get(pickupOutcode) ?? null : null;
  if (!from) from = await geocodePlaceName(pickupPostcode);

  let to = deliveryOutcode ? outcodeCoords.get(deliveryOutcode) ?? null : null;
  if (!to) to = await geocodePlaceName(deliveryPostcode);

  if (!from) return empty("Could not locate the pickup postcode. Check and try again.");
  if (!to) return empty("Could not read your delivery postcode. Enter a valid UK postcode.");

  const distanceMiles = Math.round(haversineMiles(from, to));
  const driveTimeHours = estimateTravelHours(distanceMiles);
  const range = deliveryGuideRangeForService(distanceMiles, service);
  const hub = assignPickupHub({
    pickupTown: pickupPostcode,
    pickupKey: pickupOutcode ?? pickupPostcode,
    pickupAddress: pickupPostcode,
    pickupLat: from.lat,
    pickupLng: from.lng,
  });
  const driversNearby = await countVansForHub(hub);

  return {
    itemTitle,
    service,
    serviceCategory: range.category,
    pickupPostcode,
    pickupTown: pickupOutcode ?? pickupPostcode,
    pickupHub: hub,
    deliveryArea: deliveryOutcode ?? deliveryPostcode,
    distanceMiles,
    driveTimeHours,
    estimateLow: range.low,
    estimateHigh: range.high,
    driversNearby,
    message: `Guide estimate for “${itemTitle}” — ${distanceMiles} mi${
      driveTimeHours ? ` · ~${formatDriveTime(driveTimeHours)} drive` : ""
    } · ${service} · £${range.low}–£${range.high}.`,
  };
}
