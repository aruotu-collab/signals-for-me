import type { DealScoreBand, FlipOpportunity } from "@/lib/flip/types";

export function dealBandFor(score: number): DealScoreBand {
  if (score >= 85) return "buy";
  if (score >= 70) return "good";
  if (score >= 55) return "watch";
  return "low";
}

export function dealLabelFor(band: DealScoreBand): string {
  switch (band) {
    case "buy":
      return "Buy immediately";
    case "good":
      return "Good opportunity";
    case "watch":
      return "Watch closely";
    default:
      return "Low confidence";
  }
}

/** Phase A liquidity-first score. Active-market signals are proxies, not sold history. */
export function computeDealScore(input: {
  netProfit: number;
  roiPct: number;
  confidence: number;
  compCount: number;
  marketSource: "comps" | "heuristic";
  riskFlags: string[];
  currentPrice: number;
  marketValue: number;
  liquidityScore: number;
  activeCompetition: number;
  auctionBidRatePct: number | null;
  auctionSampleCount: number;
  deadDemand: boolean;
}): { score: number; band: DealScoreBand; label: string; reasons: string[] } {
  const reasons: string[] = [];
  // 40% liquidity.
  let score = input.liquidityScore * 0.4;

  // 30% profit: absolute net and ROI both matter.
  const absoluteProfitScore =
    input.netProfit >= 300 ? 100 : input.netProfit >= 150 ? 80 : input.netProfit >= 75 ? 60 : input.netProfit >= 40 ? 35 : 10;
  const roiScore =
    input.roiPct >= 80 ? 100 : input.roiPct >= 40 ? 80 : input.roiPct >= 20 ? 55 : input.roiPct >= 10 ? 30 : 10;
  score += (absoluteProfitScore * 0.6 + roiScore * 0.4) * 0.3;
  if (input.netProfit >= 75) reasons.push(`£${Math.round(input.netProfit)} estimated net profit`);

  // 15% competition.
  const competitionScore =
    input.activeCompetition <= 10
      ? 100
      : input.activeCompetition <= 30
        ? 80
        : input.activeCompetition <= 75
          ? 55
          : input.activeCompetition <= 150
            ? 30
            : 10;
  score += competitionScore * 0.15;

  // 10% auction demand. Unknown data gets a neutral score, never a bonus.
  const auctionDemandScore =
    input.auctionSampleCount >= 3 && input.auctionBidRatePct != null
      ? input.auctionBidRatePct
      : 40;
  score += auctionDemandScore * 0.1;

  // 5% price trend reserved for sold-history Phase B; neutral in Phase A.
  score += 2.5;

  if (input.auctionBidRatePct != null && input.auctionSampleCount >= 3) {
    reasons.push(`${input.auctionBidRatePct}% live auction bid rate`);
  }
  if (input.activeCompetition > 0) {
    reasons.push(`${input.activeCompetition} active BIN competitors`);
  }

  // Spread sanity — huge gaps without comps are riskier
  if (input.marketValue > input.currentPrice * 4 && input.marketSource === "heuristic") {
    score -= 12;
    reasons.push("Large heuristic gap — verify sold prices");
  }

  // Risk penalties
  score -= input.riskFlags.length * 10;
  if (input.riskFlags.length) {
    reasons.push(`Risk flags: ${input.riskFlags.join(", ")}`);
  }
  if (input.deadDemand) {
    score -= 35;
    reasons.push("Dead-demand pattern — avoid tying up capital");
  }
  if (input.marketSource === "heuristic" || input.compCount < 3) {
    score -= Math.round((100 - input.confidence) * 0.08);
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const band = dealBandFor(score);
  return { score, band, label: dealLabelFor(band), reasons };
}

export function sortByDealScore(a: FlipOpportunity, b: FlipOpportunity): number {
  const dailyA = a.profitPerDay * (a.confidence / 100) * (a.liquidityScore / 100);
  const dailyB = b.profitPerDay * (b.confidence / 100) * (b.liquidityScore / 100);
  return dailyB - dailyA || b.dealScore - a.dealScore || b.netProfit - a.netProfit;
}
