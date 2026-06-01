import type { OpportunityResult } from "@/lib/opportunity";
import type { SignalDTO } from "@/lib/types";

// The Revenue Opportunity Scoreboard: turns a set of translated opportunities
// into the executive-briefing numbers a business owner reacts to instantly —
// money on the table, money at risk, and what to do first.

export interface ScoredItem {
  signal: SignalDTO;
  opportunity: OpportunityResult;
}

export interface Scoreboard {
  /** total revenue you could WIN (£) */
  opportunityLow: number;
  opportunityHigh: number;
  /** total revenue at RISK (£) */
  riskLow: number;
  riskHigh: number;
  /** number of opportunities detected */
  count: number;
  /** how many are high-urgency */
  urgentCount: number;
  /** how many competitors / defensive moves are in play */
  threatCount: number;
  /** 0-100 headline Revenue Opportunity Score */
  score: number;
  topOpportunity: ScoredItem | null;
  topRisk: ScoredItem | null;
}

export function computeScoreboard(items: ScoredItem[]): Scoreboard {
  let opportunityLow = 0;
  let opportunityHigh = 0;
  let riskLow = 0;
  let riskHigh = 0;
  let urgentCount = 0;
  let threatCount = 0;
  let scoreSum = 0;

  let topOpportunity: ScoredItem | null = null;
  let topRisk: ScoredItem | null = null;

  for (const it of items) {
    const o = it.opportunity;
    opportunityLow += o.valueLow;
    opportunityHigh += o.valueHigh;
    riskLow += o.riskLow;
    riskHigh += o.riskHigh;
    if (o.urgency === "high") urgentCount++;
    if (o.defensive) threatCount++;
    scoreSum += o.score;

    if (!o.defensive && (!topOpportunity || o.valueHigh > topOpportunity.opportunity.valueHigh)) {
      topOpportunity = it;
    }
    if (o.defensive && o.riskHigh > 0 && (!topRisk || o.riskHigh > topRisk.opportunity.riskHigh)) {
      topRisk = it;
    }
  }

  const score = items.length ? Math.round(scoreSum / items.length) : 0;

  return {
    opportunityLow,
    opportunityHigh,
    riskLow,
    riskHigh,
    count: items.length,
    urgentCount,
    threatCount,
    score,
    topOpportunity,
    topRisk,
  };
}
