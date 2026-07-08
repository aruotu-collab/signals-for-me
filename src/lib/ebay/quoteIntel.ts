import { inferCategoryFromTitle, intelServiceFromTitle } from "@/lib/ebay/category";
import { analyzeJob, profitAtPayment, type JobIntelInput, type JobIntelSettings } from "@/lib/shiply/intelligence";

export type QuoteIntelInput = {
  itemTitle: string | null;
  distanceMiles: number | null;
  bidCount?: number;
};

export function quoteIntelInput(req: QuoteIntelInput): JobIntelInput | null {
  if (req.distanceMiles == null || req.distanceMiles < 1) return null;
  return {
    miles: req.distanceMiles,
    quotes: req.bidCount ?? 0,
    service: intelServiceFromTitle(req.itemTitle),
  };
}

export function quoteCategory(title: string | null): string {
  return inferCategoryFromTitle(title);
}

export function quoteServiceForRequest(req: { service?: string | null; itemTitle?: string | null }): string {
  if (req.service?.trim()) return req.service.trim();
  return intelServiceFromTitle(req.itemTitle);
}

export function quoteCategoryForRequest(req: { service?: string | null; itemTitle?: string | null }): string {
  if (req.service?.trim()) return req.service.trim();
  return inferCategoryFromTitle(req.itemTitle);
}

export function quoteIntelInputFromRequest(req: {
  service?: string | null;
  itemTitle?: string | null;
  distanceMiles?: number | null;
  bidCount?: number;
}): JobIntelInput | null {
  if (req.distanceMiles == null || req.distanceMiles < 1) return null;
  return {
    miles: req.distanceMiles,
    quotes: req.bidCount ?? 0,
    service: quoteServiceForRequest(req),
  };
}

export function deliveryGuideRangeForService(miles: number, service: string) {
  const category = service;
  const intel = analyzeJob({ miles, quotes: 0, service });
  if (!intel) {
    const base = 35;
    const perMile = 0.55;
    const low = Math.round(base + miles * perMile * 0.85);
    const high = Math.round(base + miles * perMile * 1.35);
    return { low: Math.max(low, 25), high: Math.max(high, low + 15), category, service };
  }
  return { low: intel.bidLow, high: intel.bidHigh, category, service };
}

export function deliveryGuideRange(miles: number, itemTitle: string | null | undefined) {
  const service = intelServiceFromTitle(itemTitle);
  const category = inferCategoryFromTitle(itemTitle);
  const intel = analyzeJob({ miles, quotes: 0, service });
  if (!intel) {
    const base = 35;
    const perMile = 0.55;
    const low = Math.round(base + miles * perMile * 0.85);
    const high = Math.round(base + miles * perMile * 1.35);
    return { low: Math.max(low, 25), high: Math.max(high, low + 15), category, service };
  }
  return { low: intel.bidLow, high: intel.bidHigh, category, service };
}

export type BidQualityWarning = {
  level: "error" | "warn";
  message: string;
};

export function bidQualityWarnings(
  amount: number,
  input: JobIntelInput,
  settings?: JobIntelSettings,
): BidQualityWarning[] {
  const warnings: BidQualityWarning[] = [];
  const intel = analyzeJob(input, settings);
  if (!intel) return warnings;

  const minFuel = intel.fuelCost + 15;
  if (amount < minFuel) {
    warnings.push({
      level: "error",
      message: `Below est. fuel + loading (~£${minFuel}). You'd lose money on this run.`,
    });
  }

  const atPay = profitAtPayment(amount, input, settings);
  if (atPay && settings?.minHourlyRate && settings.minHourlyRate > 0 && atPay.hourlyRate < settings.minHourlyRate) {
    warnings.push({
      level: "warn",
      message: `£${atPay.hourlyRate}/h profit — below your £${settings.minHourlyRate}/h minimum.`,
    });
  }

  return warnings;
}
