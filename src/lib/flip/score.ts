import {
  maxBidForProfit,
  netProfitAfterFlip,
  roiPct,
  saleFees,
  totalAcquisitionCost,
} from "@/lib/flip/fees";
import {
  DEFAULT_FLIP_FEES,
  FLIP_SCAN_PRIORITY,
  type FlipCategory,
  type FlipCategoryName,
  type FlipFeeSettings,
  type FlipOpportunity,
} from "@/lib/flip/types";
import { computeDealScore, sortByDealScore } from "@/lib/flip/dealScore";
import { estimateSellMarkets } from "@/lib/flip/marketplaces";
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
  enrichComps?: boolean;
  limitPerCategory?: number;
  page?: number;
  pageSize?: number;
  maxResults?: number;
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
  const marketSource: "comps" | "heuristic" = marketOverride?.source ?? "heuristic";
  const compCount = marketOverride?.compCount ?? 0;

  marketValue = Math.round(marketValue * riskMarketMultiplier(flags));

  const buyPrice = item.currentPrice;
  const netProfit = netProfitAfterFlip(buyPrice, marketValue, fees);
  if (netProfit < minProfit) return null;

  const feesOnSale = saleFees(marketValue, fees);
  const totalCost = totalAcquisitionCost(buyPrice, fees);
  const maxBid = maxBidForProfit(marketValue, minProfit, fees);
  const endsMins = endsInMinutes(item.endsAt);
  const roi = roiPct(netProfit, buyPrice, fees);

  let confidence = heuristic.confidence;
  if (marketSource === "comps" && compCount >= 3) confidence = Math.min(92, confidence + 20);
  else if (marketSource === "comps" && compCount >= 1) confidence = Math.min(85, confidence + 10);
  if (flags.length) confidence = Math.max(15, confidence - flags.length * 12);
  if (endsMins != null && endsMins < 60) confidence = Math.min(95, confidence + 5);
  if (!heuristic.brand) confidence = Math.max(15, confidence - 15);
  if (marketValue > buyPrice * 3 && marketSource === "heuristic") {
    confidence = Math.max(20, confidence - 20);
  }

  const deal = computeDealScore({
    netProfit,
    roiPct: roi,
    confidence,
    compCount,
    marketSource,
    endsInMinutes: endsMins,
    riskFlags: flags,
    currentPrice: buyPrice,
    marketValue,
  });

  const sell = estimateSellMarkets({
    category: item.category,
    ebayMarketValue: marketValue,
    totalCost,
    outboundShipping: fees.outboundShipping,
  });

  const why: string[] = [];
  why.push(`Deal Score ${deal.score}/100 — ${deal.label}`);
  if (heuristic.brand) {
    why.push(`${heuristic.brand} typically resells around £${heuristic.marketValue.toLocaleString("en-GB")}`);
  }
  if (marketSource === "comps" && compCount > 0) {
    why.push(`Live Buy-it-now comps median £${marketValue.toLocaleString("en-GB")} (${compCount} listings)`);
  } else {
    why.push("Market value from brand/model heuristic — treat as a lead, verify sold prices");
  }
  why.push(
    `Current bid £${buyPrice.toLocaleString("en-GB")} → eBay net ~£${netProfit.toLocaleString("en-GB")} after fees`,
  );
  if (sell.bestSellMarket !== "eBay BIN" && sell.markets[0]) {
    why.push(
      `Best sell channel: ${sell.bestSellMarket} (~£${sell.markets[0].netProfit.toLocaleString("en-GB")} net)`,
    );
  }
  if (maxBid > buyPrice) {
    why.push(`You can bid up to ~£${maxBid.toLocaleString("en-GB")} and still clear £${minProfit}+ on eBay`);
  }
  if (endsMins != null && endsMins >= 0) {
    why.push(endsMins < 60 ? `Ends in ${endsMins} minutes` : `Ends in ~${Math.round(endsMins / 60)} hours`);
  }
  for (const r of deal.reasons.slice(0, 2)) why.push(r);

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
    roiPct: roi,
    confidence,
    dealScore: deal.score,
    dealBand: deal.band,
    dealLabel: deal.label,
    riskFlags: flags,
    why,
    maxBid,
    sellMarkets: sell.markets,
    bestSellMarket: sell.bestSellMarket,
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
  categories: FlipCategoryName[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}> {
  if (!isEbayApiConfigured()) {
    return {
      opportunities: [],
      scanned: 0,
      source: "unconfigured",
      categories: [],
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 1,
    };
  }

  const minProfit = Math.max(0, input.minProfit ?? 100);
  const maxEndsInHours = input.maxEndsInHours ?? 24;
  const fees: FlipFeeSettings = { ...DEFAULT_FLIP_FEES, ...input.fees };
  const enrichComps = input.enrichComps !== false;
  const pageSize = Math.min(50, Math.max(5, input.pageSize ?? 10));
  const maxResults = Math.min(200, Math.max(pageSize, input.maxResults ?? 100));

  // "all" scans priority categories only to stay within serverless time limits.
  const categories: FlipCategoryName[] =
    input.category && input.category !== "all"
      ? [input.category]
      : FLIP_SCAN_PRIORITY.slice(0, 8);

  const limitPerCategory =
    input.limitPerCategory ?? (categories.length > 1 ? 22 : 40);

  const items: FlipAuctionItem[] = [];
  for (const cat of categories) {
    try {
      const batch = await searchEndingAuctions({ category: cat, limit: limitPerCategory });
      items.push(...batch);
    } catch {
      // continue
    }
  }

  const maxMins = maxEndsInHours * 60;
  const filtered = items.filter((item) => {
    const mins = endsInMinutes(item.endsAt);
    if (mins == null) return true;
    if (mins < 0) return false;
    return mins <= maxMins;
  });

  const prelim: { item: FlipAuctionItem; opp: FlipOpportunity }[] = [];
  for (const item of filtered) {
    const opp = scoreItem(item, fees, Math.max(0, minProfit * 0.5));
    if (opp) prelim.push({ item, opp });
  }

  const toEnrich = enrichComps
    ? [...prelim].sort((a, b) => b.opp.dealScore - a.opp.dealScore || b.opp.netProfit - a.opp.netProfit).slice(0, 24)
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

  opportunities.sort(sortByDealScore);

  const ranked = opportunities.slice(0, maxResults);
  const total = ranked.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, input.page ?? 1), totalPages);
  const start = (page - 1) * pageSize;

  return {
    opportunities: ranked.slice(start, start + pageSize),
    scanned: filtered.length,
    source: "live",
    categories,
    page,
    pageSize,
    total,
    totalPages,
  };
}
