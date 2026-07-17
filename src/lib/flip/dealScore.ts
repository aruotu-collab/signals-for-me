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

/**
 * Composite Deal Score from profit, ROI, confidence, comps, urgency and risk.
 * Intentionally heuristic — not sold-market ML — but ranks like a sourcing assistant.
 */
export function computeDealScore(input: {
  netProfit: number;
  roiPct: number;
  confidence: number;
  compCount: number;
  marketSource: "comps" | "heuristic";
  endsInMinutes: number | null;
  riskFlags: string[];
  currentPrice: number;
  marketValue: number;
}): { score: number; band: DealScoreBand; label: string; reasons: string[] } {
  const reasons: string[] = [];
  let score = 35;

  // Profit contribution (up to ~30)
  if (input.netProfit >= 300) {
    score += 30;
    reasons.push("Strong absolute profit");
  } else if (input.netProfit >= 150) {
    score += 24;
    reasons.push("Solid absolute profit");
  } else if (input.netProfit >= 75) {
    score += 16;
  } else if (input.netProfit >= 40) {
    score += 8;
  }

  // ROI contribution (up to ~20)
  if (input.roiPct >= 80) {
    score += 20;
    reasons.push(`High ROI (${input.roiPct}%)`);
  } else if (input.roiPct >= 40) {
    score += 14;
  } else if (input.roiPct >= 20) {
    score += 8;
  } else if (input.roiPct >= 10) {
    score += 4;
  }

  // Confidence / comps (up to ~20)
  score += Math.round((input.confidence / 100) * 14);
  if (input.marketSource === "comps" && input.compCount >= 3) {
    score += 6;
    reasons.push(`${input.compCount} live BIN comps`);
  } else if (input.marketSource === "comps") {
    score += 3;
  }

  // Urgency — ending soon is good if score is otherwise solid (up to ~8)
  if (input.endsInMinutes != null && input.endsInMinutes >= 0) {
    if (input.endsInMinutes <= 60) {
      score += 8;
      reasons.push("Ending within an hour");
    } else if (input.endsInMinutes <= 180) {
      score += 5;
    } else if (input.endsInMinutes <= 720) {
      score += 2;
    }
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

  score = Math.max(0, Math.min(100, Math.round(score)));
  const band = dealBandFor(score);
  return { score, band, label: dealLabelFor(band), reasons };
}

export function sortByDealScore(a: FlipOpportunity, b: FlipOpportunity): number {
  const scoreA = a.dealScore * 0.7 + a.netProfit * 0.01 * (a.confidence / 100) * 30;
  const scoreB = b.dealScore * 0.7 + b.netProfit * 0.01 * (b.confidence / 100) * 30;
  return scoreB - scoreA;
}
