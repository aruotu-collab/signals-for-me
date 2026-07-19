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
import { estimateLiquidity, type MarketActivitySignals } from "@/lib/flip/liquidity";
import { estimateSellMarkets } from "@/lib/flip/marketplaces";
import { heuristicMarketValue } from "@/lib/flip/market";
import {
  isPartsOrNotWorkingCondition,
  riskFlagsFromTitle,
  riskMarketMultiplier,
  shouldHideByDefault,
} from "@/lib/flip/risk";
import { buildBudgetPlan, buildMonthlyPlan, type CapitalPlan } from "@/lib/flip/plan";
import {
  searchEndingAuctions,
  searchMarketActivity,
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
  /** Only show auctions at or below this current bid */
  maxBudget?: number;
  /** Monthly net profit target (£) */
  monthlyGoal?: number;
  /** Capital available to start buying (£) */
  startingCapital?: number;
};

export type FindOpportunitiesResult = {
  opportunities: FlipOpportunity[];
  scanned: number;
  source: "live" | "unconfigured";
  categories: FlipCategoryName[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  skippedRisky: number;
  skippedIlliquid: number;
  plan: CapitalPlan | null;
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
  marketOverride?: {
    marketValue: number;
    compCount: number;
    source: "comps" | "heuristic";
    signals: MarketActivitySignals | null;
  },
): FlipOpportunity | null {
  if (isPartsOrNotWorkingCondition(item.conditionId)) return null;

  const flags = riskFlagsFromTitle(item.title);
  if (shouldHideByDefault(flags)) return null;

  const heuristic = heuristicMarketValue(item.title, item.category, item.currentPrice);
  let marketValue = marketOverride?.marketValue ?? heuristic.marketValue;
  const marketSource: "comps" | "heuristic" = marketOverride?.source ?? "heuristic";
  const compCount = marketOverride?.compCount ?? 0;
  const signals = marketOverride?.signals ?? null;

  marketValue = Math.round(marketValue * riskMarketMultiplier(flags));

  const buyPrice = item.currentPrice;
  const initialNetProfit = netProfitAfterFlip(buyPrice, marketValue, fees);
  let liquidity = estimateLiquidity({
    category: item.category,
    netProfit: initialNetProfit,
    signals,
  });

  // Active BIN values are asking prices, not proof of a sale. Risk-adjust them
  // using current auction demand and competition before calculating profit.
  if (marketSource === "comps" && signals?.binMedian != null) {
    marketValue = Math.round(signals.binMedian * liquidity.askPriceMultiplier);
  }

  const netProfit = netProfitAfterFlip(buyPrice, marketValue, fees);
  if (netProfit < minProfit) return null;
  liquidity = estimateLiquidity({ category: item.category, netProfit, signals });

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
    riskFlags: flags,
    currentPrice: buyPrice,
    marketValue,
    liquidityScore: liquidity.score,
    activeCompetition: liquidity.activeCompetition,
    auctionBidRatePct: liquidity.auctionBidRatePct,
    auctionSampleCount: signals?.auctionSampleCount ?? 0,
    deadDemand: liquidity.deadDemand,
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
    why.push(
      `Risk-adjusted resale £${marketValue.toLocaleString("en-GB")} from active BIN asks (not sold prices)`,
    );
  } else {
    why.push("Market value from brand/model heuristic — treat as a lead, verify sold prices");
  }
  why.push(
    `Liquidity ${liquidity.score}/100 (${liquidity.label}) · ~${liquidity.estimatedDaysToSell} days · £${liquidity.profitPerDay.toLocaleString("en-GB")}/day`,
  );
  for (const reason of liquidity.reasons.slice(0, 2)) why.push(reason);
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
    activeCompetition: liquidity.activeCompetition,
    auctionBidRatePct: liquidity.auctionBidRatePct,
    auctionSampleCount: signals?.auctionSampleCount ?? 0,
    averageBidCount: signals?.averageBidCount ?? 0,
    liquidityScore: liquidity.score,
    liquidityLabel: liquidity.label,
    estimatedDaysToSell: liquidity.estimatedDaysToSell,
    profitPerDay: liquidity.profitPerDay,
    deadDemand: liquidity.deadDemand,
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
): Promise<{
  marketValue: number;
  compCount: number;
  source: "comps" | "heuristic";
  signals: MarketActivitySignals | null;
} | null> {
  const signals = await searchMarketActivity({
    category: item.category,
    title: item.title,
    brand,
    limit: 12,
  });
  if (!signals) return null;
  if (signals.binMedian == null || signals.binMedian <= 0) {
    const heuristic = heuristicMarketValue(item.title, item.category, item.currentPrice);
    return {
      marketValue: heuristic.marketValue,
      compCount: 0,
      source: "heuristic",
      signals,
    };
  }
  return {
    marketValue: Math.round(signals.binMedian),
    compCount: signals.binSampleCount,
    source: "comps",
    signals,
  };
}

export async function findFlipOpportunities(
  input: FindOpportunitiesInput = {},
): Promise<FindOpportunitiesResult> {
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
      skippedRisky: 0,
      skippedIlliquid: 0,
      plan: null,
    };
  }

  const minProfit = Math.max(0, input.minProfit ?? 100);
  const maxEndsInHours = input.maxEndsInHours ?? 24;
  const fees: FlipFeeSettings = { ...DEFAULT_FLIP_FEES, ...input.fees };
  const enrichComps = input.enrichComps !== false;
  const pageSize = Math.min(50, Math.max(5, input.pageSize ?? 10));
  const maxResults = Math.min(200, Math.max(pageSize, input.maxResults ?? 100));
  const maxBudget =
    input.maxBudget != null && Number.isFinite(input.maxBudget) && input.maxBudget > 0
      ? input.maxBudget
      : null;
  const monthlyGoal =
    input.monthlyGoal != null && Number.isFinite(input.monthlyGoal) && input.monthlyGoal > 0
      ? input.monthlyGoal
      : null;
  const startingCapital =
    input.startingCapital != null && Number.isFinite(input.startingCapital) && input.startingCapital > 0
      ? input.startingCapital
      : null;

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

  let skippedRisky = 0;
  for (const item of filtered) {
    if (isPartsOrNotWorkingCondition(item.conditionId) || shouldHideByDefault(riskFlagsFromTitle(item.title))) {
      skippedRisky += 1;
    }
  }

  const prelim: { item: FlipAuctionItem; opp: FlipOpportunity }[] = [];
  for (const item of filtered) {
    const opp = scoreItem(item, fees, Math.max(0, minProfit * 0.5));
    if (opp) prelim.push({ item, opp });
  }

  const toEnrich = enrichComps
    ? [...prelim].sort((a, b) => b.opp.dealScore - a.opp.dealScore || b.opp.netProfit - a.opp.netProfit).slice(0, 24)
    : [];

  const enrichMap = new Map<
    string,
    {
      marketValue: number;
      compCount: number;
      source: "comps" | "heuristic";
      signals: MarketActivitySignals | null;
    }
  >();
  await Promise.all(
    toEnrich.map(async ({ item, opp }) => {
      const enriched = await enrichWithComps(item, opp.brand);
      if (enriched) enrichMap.set(item.id, enriched);
    }),
  );

  let opportunities: FlipOpportunity[] = [];
  let skippedIlliquid = 0;
  for (const { item } of prelim) {
    const override = enrichMap.get(item.id);
    // In live mode, only recommend items that received the Phase A market
    // activity check. It is better to show fewer verified leads than an
    // optimistic heuristic-only "deal" that could trap capital.
    if (enrichComps && !override) continue;
    const opp = scoreItem(item, fees, minProfit, override);
    if (!opp) continue;
    if (!input.includeRisky && opp.riskFlags.length > 0 && opp.confidence < 40) continue;
    if (!input.includeRisky && opp.deadDemand) {
      skippedIlliquid += 1;
      continue;
    }
    opportunities.push(opp);
  }

  opportunities.sort(sortByDealScore);

  // Affordability filters for budget / monthly modes.
  if (maxBudget != null) {
    opportunities = opportunities.filter((o) => o.currentPrice <= maxBudget);
  } else if (monthlyGoal != null && startingCapital != null) {
    opportunities = opportunities.filter((o) => o.currentPrice <= startingCapital);
  }

  let plan: CapitalPlan | null = null;
  if (monthlyGoal != null && startingCapital != null) {
    plan = buildMonthlyPlan(opportunities, { monthlyGoal, startingCapital });
  } else if (maxBudget != null) {
    plan = buildBudgetPlan(opportunities, maxBudget);
  }

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
    skippedRisky,
    skippedIlliquid,
    plan,
  };
}
