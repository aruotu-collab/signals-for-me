import type { FlipCategoryName } from "@/lib/flip/types";

export type MarketActivitySignals = {
  activeBinCount: number;
  binSampleCount: number;
  binMedian: number | null;
  auctionSampleCount: number;
  auctionsWithBids: number;
  averageBidCount: number;
};

export type LiquidityEstimate = {
  /** 0–100 Phase A proxy based on active competition and live auction bidding. */
  score: number;
  label: "fast" | "steady" | "slow" | "dead";
  estimatedDaysToSell: number;
  profitPerDay: number;
  auctionBidRatePct: number | null;
  activeCompetition: number;
  deadDemand: boolean;
  reasons: string[];
  /** Discount applied to optimistic active BIN prices. */
  askPriceMultiplier: number;
};

const CATEGORY_BASE_DAYS: Record<FlipCategoryName, number> = {
  Watches: 18,
  Phones: 5,
  Laptops: 8,
  "Power Tools": 9,
  Cameras: 12,
  "Camera Lenses": 16,
  "Graphics Cards": 7,
  "Gaming Consoles": 5,
  iPads: 6,
  "Apple Watches": 6,
  Drones: 12,
  LEGO: 14,
  "Musical Gear": 20,
  Sneakers: 18,
};

export function estimateLiquidity(opts: {
  category: FlipCategoryName;
  netProfit: number;
  signals?: MarketActivitySignals | null;
}): LiquidityEstimate {
  const { category, netProfit, signals } = opts;
  const reasons: string[] = [];
  const active = signals?.activeBinCount ?? 0;
  const auctionSample = signals?.auctionSampleCount ?? 0;
  const bidRate =
    auctionSample > 0
      ? Math.round(((signals?.auctionsWithBids ?? 0) / auctionSample) * 100)
      : null;
  const avgBids = signals?.averageBidCount ?? 0;

  let score = 50;

  // Auction bidding is the strongest live demand signal available without sold-data access.
  if (bidRate != null && auctionSample >= 3) {
    if (bidRate >= 70) {
      score += 30;
      reasons.push(`${bidRate}% of similar live auctions have bids`);
    } else if (bidRate >= 45) {
      score += 18;
      reasons.push(`${bidRate}% of similar live auctions have bids`);
    } else if (bidRate >= 20) {
      score += 2;
      reasons.push(`Only ${bidRate}% of similar live auctions have bids`);
    } else {
      score -= 32;
      reasons.push(`Dead auction demand: only ${bidRate}% have bids`);
    }
  } else {
    score -= 10;
    reasons.push("Limited auction-demand sample");
  }

  if (avgBids >= 5) score += 12;
  else if (avgBids >= 2) score += 6;
  else if (auctionSample >= 3 && avgBids < 0.5) score -= 10;

  // Active listings measure competition, not value. Penalise crowded markets.
  if (active >= 250) {
    score -= 24;
    reasons.push(`${active}+ active competitors`);
  } else if (active >= 100) {
    score -= 16;
    reasons.push(`${active} active competitors`);
  } else if (active >= 40) {
    score -= 8;
    reasons.push(`${active} active competitors`);
  } else if (active > 0 && active <= 15) {
    score += 8;
    reasons.push(`Low competition (${active} active)`);
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const deadDemand =
    auctionSample >= 5 &&
    (bidRate ?? 100) <= 10 &&
    active >= 20;

  let label: LiquidityEstimate["label"];
  if (score >= 75) label = "fast";
  else if (score >= 50) label = "steady";
  else if (score >= 25) label = "slow";
  else label = "dead";

  const baseDays = CATEGORY_BASE_DAYS[category];
  const demandFactor = Math.max(0.35, 1.9 - score / 65);
  const competitionFactor =
    active >= 250 ? 2.2 : active >= 100 ? 1.7 : active >= 40 ? 1.3 : 1;
  const estimatedDaysToSell = Math.max(
    1,
    Math.min(180, Math.round(baseDays * demandFactor * competitionFactor)),
  );
  const profitPerDay =
    estimatedDaysToSell > 0
      ? Math.round((netProfit / estimatedDaysToSell) * 100) / 100
      : 0;

  // Active BIN medians are asking prices. Discount them harder when demand is weak.
  const askPriceMultiplier =
    score >= 75 ? 0.92 : score >= 50 ? 0.82 : score >= 25 ? 0.68 : 0.5;

  return {
    score,
    label,
    estimatedDaysToSell,
    profitPerDay,
    auctionBidRatePct: bidRate,
    activeCompetition: active,
    deadDemand,
    reasons,
    askPriceMultiplier,
  };
}
