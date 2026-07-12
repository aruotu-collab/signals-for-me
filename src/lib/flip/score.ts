import {
  maxBidForProfit,
  netProfitAfterFlip,
  roiPct,
  saleFees,
  totalAcquisitionCost,
} from "@/lib/flip/fees";
import {
  DEFAULT_FLIP_FEES,
  FLIP_CATEGORIES,
  type FlipCategory,
  type FlipFeeSettings,
  type FlipOpportunity,
} from "@/lib/flip/types";
import { heuristicMarketValue } from "@/lib/flip/market";
import { riskFlagsFromTitle, riskMarketMultiplier, shouldHideByDefault } from "@/lib/flip/risk";
import {
  median,
  searchBinComps,
  searchEndingAuctions,
  type FlipAuctionItem,
} from "@/lib/flip/search";
import { isEbayApiConfigured } from "@/lib/ebay/client";

export type FindOpportunitiesInput = {
  minProfit?: number;
  category?: FlipCategory;
  maxEndsInHours?: number;
  includeRisky?: boolean;
  fees?: Partial<FlipFeeSettings>;
  /** Enrich top heuristic hits with live BIN comps (slower). Default true. */
  enrichComps?: boolean;
  limitPerCategory?: number;
};

function endsInMinutes(endsAt: string | null): number | null {
  if (!endsAt) return null;
  const ms = new Date(endsAt).getTime() - Date.now();
  if (!Number.isFinite(ms)) return null;
  return Math.round(ms / 60_000);
}

function scoreItem(
  item: FlipAuctionItem,
  fees: FlipFeeSettings,
  minProfit: number,
  marketOverride?: { marketValue: number; compCount: number; source: "comps" | "heuristic" },
): FlipOpportunity | null {
  const flags = riskFlagsFromTitle(item.title);
  if (shouldHideByDefault(flags)) return null;

  const heuristic = heuristicMarketValue(item.title, item.category, item.currentPrice);
  let marketValue = marketOverride?.marketValue ?? heuristic.marketValue;
  let marketSource: "comps" | "heuristic" = marketOverride?.source ?? "heuristic";
  let compCount = marketOverride?.compCount ?? 0;

  marketValue = Math.round(marketValue * riskMarketMultiplier(flags));

  const buyPrice = item.currentPrice;
  const netProfit = netProfitAfterFlip(buyPrice, marketValue, fees);
  if (netProfit < minProfit) return null;

  const feesOnSale = saleFees(marketValue, fees);
  const totalCost = totalAcquisitionCost(buyPrice, fees);
  const maxBid = maxBidForProfit(marketValue, minProfit, fees);
  const endsMins = endsInMinutes(item.endsAt);

  let confidence = heuristic.confidence;
  if (marketSource === "comps" && compCount >= 3) confidence = Math.min(92, confidence + 20);
  else if (marketSource === "comps" && compCount >= 1) confidence = Math.min(85, confidence + 10);
  if (flags.length) confidence = Math.max(15, confidence - flags.length * 12);
  if (endsMins != null && endsMins < 60) confidence = Math.min(95, confidence + 5);
  if (!heuristic.brand) confidence = Math.max(15, confidence - 15);

  // Suspiciously large gap vs current bid → lower confidence
  if (marketValue > buyPrice * 3 && marketSource === "heuristic") {
    confidence = Math.max(20, confidence - 20);
  }

  const why: string[] = [];
  if (heuristic.brand) why.push(`${heuristic.brand} typically resells around £${heuristic.marketValue.toLocaleString("en-GB")}`);
  if (marketSource === "comps" && compCount > 0) {
    why.push(`Live Buy-it-now comps median £${marketValue.toLocaleString("en-GB")} (${compCount} listings)`);
  } else {
    why.push("Market value from brand/model heuristic — treat as a lead, verify sold prices");
  }
  why.push(
    `Current bid £${buyPrice.toLocaleString("en-GB")} → est. net £${netProfit.toLocaleString("en-GB")} after ~${Math.round(fees.feeRate * 100)}% fees + postage`,
  );
  if (maxBid > buyPrice) {
    why.push(`You can bid up to ~£${maxBid.toLocaleString("en-GB")} and still clear £${minProfit}+ profit`);
  } else {
    why.push(`Already near your max bid (£${maxBid.toLocaleString("en-GB")}) for £${minProfit}+ profit`);
  }
  if (endsMins != null && endsMins >= 0) {
    why.push(endsMins < 60 ? `Ends in ${endsMins} minutes` : `Ends in ~${Math.round(endsMins / 60)} hours`);
  }

  return {
    id: item.id,
    title: item.title,
    category: item.category,
    brand: heuristic.brand,
    imageUrl: item.imageUrl,
    ebayUrl: item.ebayUrl,
    location: item.location,
    buyingType: item.buyingType,
    currentPrice: buyPrice,
    currency: item.currency,
    endsAt: item.endsAt,
    endsInMinutes: endsMins,
    marketValue,
    marketSource,
    compCount,
    fees: Math.round((feesOnSale + fees.outboundShipping) * 100) / 100,
    totalCost,
    netProfit,
    roiPct: roiPct(netProfit, buyPrice, fees),
    confidence,
    riskFlags: flags,
    why,
    maxBid,
  };
}

async function enrichWithComps(
  item: FlipAuctionItem,
  brand: string | null,
): Promise<{ marketValue: number; compCount: number; source: "comps" | "heuristic" } | null> {
  const prices = await searchBinComps({
    category: item.category,
    title: item.title,
    brand,
    limit: 8,
  });
  const med = median(prices);
  if (med == null || med <= 0) return null;
  return { marketValue: Math.round(med), compCount: prices.length, source: "comps" };
}

export async function findFlipOpportunities(input: FindOpportunitiesInput = {}): Promise<{
  opportunities: FlipOpportunity[];
  scanned: number;
  source: "live" | "unconfigured";
  categories: Exclude<FlipCategory, "all">[];
}> {
  if (!isEbayApiConfigured()) {
    return { opportunities: [], scanned: 0, source: "unconfigured", categories: [] };
  }

  const minProfit = Math.max(0, input.minProfit ?? 100);
  const maxEndsInHours = input.maxEndsInHours ?? 24;
  const fees: FlipFeeSettings = { ...DEFAULT_FLIP_FEES, ...input.fees };
  const enrichComps = input.enrichComps !== false;
  const limitPerCategory = input.limitPerCategory ?? 30;

  const categories: Exclude<FlipCategory, "all">[] =
    input.category && input.category !== "all"
      ? [input.category]
      : [...FLIP_CATEGORIES];

  const items: FlipAuctionItem[] = [];
  for (const cat of categories) {
    try {
      const batch = await searchEndingAuctions({ category: cat, limit: limitPerCategory });
      items.push(...batch);
    } catch {
      // continue other categories
    }
  }

  const maxMins = maxEndsInHours * 60;
  const filtered = items.filter((item) => {
    const mins = endsInMinutes(item.endsAt);
    if (mins == null) return true;
    if (mins < 0) return false;
    return mins <= maxMins;
  });

  // First pass: heuristic scoring
  const prelim: { item: FlipAuctionItem; opp: FlipOpportunity }[] = [];
  for (const item of filtered) {
    const opp = scoreItem(item, fees, Math.max(0, minProfit * 0.5)); // soft gate before comps
    if (opp) prelim.push({ item, opp });
  }

  // Enrich the most promising with BIN comps (cap to keep latency sane)
  const toEnrich = enrichComps
    ? [...prelim].sort((a, b) => b.opp.netProfit - a.opp.netProfit).slice(0, 12)
    : [];

  const enrichMap = new Map<string, { marketValue: number; compCount: number; source: "comps" | "heuristic" }>();
  await Promise.all(
    toEnrich.map(async ({ item, opp }) => {
      const enriched = await enrichWithComps(item, opp.brand);
      if (enriched) enrichMap.set(item.id, enriched);
    }),
  );

  const opportunities: FlipOpportunity[] = [];
  for (const { item } of prelim) {
    const override = enrichMap.get(item.id);
    const opp = scoreItem(item, fees, minProfit, override);
    if (!opp) continue;
    if (!input.includeRisky && opp.riskFlags.length > 0 && opp.confidence < 40) continue;
    opportunities.push(opp);
  }

  opportunities.sort((a, b) => {
    const scoreA = a.netProfit * (a.confidence / 100);
    const scoreB = b.netProfit * (b.confidence / 100);
    return scoreB - scoreA;
  });

  return {
    opportunities: opportunities.slice(0, 40),
    scanned: filtered.length,
    source: "live",
    categories,
  };
}
