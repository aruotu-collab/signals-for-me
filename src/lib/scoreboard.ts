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
  /** confidence-weighted expected money to win (£) — the headline number */
  expectedGain: number;
  /** confidence-weighted expected money at risk (£) */
  expectedRisk: number;
  /** net = expectedGain - expectedRisk */
  netOpportunity: number;
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
  let expectedGain = 0;
  let expectedRisk = 0;

  let topOpportunity: ScoredItem | null = null;
  let topRisk: ScoredItem | null = null;

  for (const it of items) {
    const o = it.opportunity;
    opportunityLow += o.valueLow;
    opportunityHigh += o.valueHigh;
    riskLow += o.riskLow;
    riskHigh += o.riskHigh;
    if (o.expectedValue >= 0) expectedGain += o.expectedValue;
    else expectedRisk += -o.expectedValue;
    if (o.urgency === "high") urgentCount++;
    if (o.defensive) threatCount++;
    scoreSum += o.score;

    // Rank by expected value (confidence-weighted £) so the headline picks
    // reflect the real "best bet", not just the biggest headline range.
    if (!o.defensive && (!topOpportunity || o.expectedValue > topOpportunity.opportunity.expectedValue)) {
      topOpportunity = it;
    }
    if (o.defensive && o.riskHigh > 0 && (!topRisk || o.expectedValue < topRisk.opportunity.expectedValue)) {
      topRisk = it;
    }
  }

  const score = items.length ? Math.round(scoreSum / items.length) : 0;

  return {
    opportunityLow,
    opportunityHigh,
    riskLow,
    riskHigh,
    expectedGain,
    expectedRisk,
    netOpportunity: expectedGain - expectedRisk,
    count: items.length,
    urgentCount,
    threatCount,
    score,
    topOpportunity,
    topRisk,
  };
}

// ---------------------------------------------------------------------------
// Lens roll-up: the spine of the lens-driven app. Every opportunity belongs to
// exactly one business-specific lens (Gold, Distress, Implants, …). Grouping by
// lens turns the flat list into "your money, split into your buckets" — which is
// how an owner actually thinks about where to act.
// ---------------------------------------------------------------------------

export interface LensGroup {
  key: string;
  label: string;
  /** number of live opportunities in this lens */
  count: number;
  /** confidence-weighted net £ in this lens (+ win, − at risk) */
  expectedValue: number;
  expectedGain: number;
  expectedRisk: number;
  /** headline £ range across the lens */
  valueLow: number;
  valueHigh: number;
  /** best ROI multiple available in the lens */
  topRoi: number;
  urgentCount: number;
  /** the lens nets out negative (a defend-this bucket) */
  defensive: boolean;
  /** strongest single opportunity in the lens, by |expected value| */
  top: ScoredItem | null;
}

/**
 * Roll a set of opportunities up into their business lenses.
 * `lenses` provides the label + canonical ordering; only lenses that actually
 * have at least one opportunity are returned, sorted by expected value.
 */
export function groupByLens(
  items: ScoredItem[],
  lenses: { key: string; label: string }[],
): LensGroup[] {
  const order = new Map(lenses.map((l, i) => [l.key, i] as const));
  const labelOf = new Map(lenses.map((l) => [l.key, l.label] as const));
  const byKey = new Map<string, LensGroup>();

  for (const it of items) {
    const o = it.opportunity;
    const key = o.lensKey || o.archetype;
    let g = byKey.get(key);
    if (!g) {
      g = {
        key,
        label: o.lensLabel || labelOf.get(key) || o.label,
        count: 0,
        expectedValue: 0,
        expectedGain: 0,
        expectedRisk: 0,
        valueLow: 0,
        valueHigh: 0,
        topRoi: 0,
        urgentCount: 0,
        defensive: false,
        top: null,
      };
      byKey.set(key, g);
    }
    g.count += 1;
    g.expectedValue += o.expectedValue;
    if (o.expectedValue >= 0) g.expectedGain += o.expectedValue;
    else g.expectedRisk += -o.expectedValue;
    g.valueLow += o.defensive ? o.riskLow : o.valueLow;
    g.valueHigh += o.defensive ? o.riskHigh : o.valueHigh;
    if (o.roi > g.topRoi) g.topRoi = o.roi;
    if (o.urgency === "high") g.urgentCount += 1;
    if (!g.top || Math.abs(o.expectedValue) > Math.abs(g.top.opportunity.expectedValue)) {
      g.top = it;
    }
  }

  const groups = Array.from(byKey.values());
  for (const g of groups) g.defensive = g.expectedValue < 0;
  groups.sort((a, b) => {
    if (b.expectedValue !== a.expectedValue) return b.expectedValue - a.expectedValue;
    return (order.get(a.key) ?? 99) - (order.get(b.key) ?? 99);
  });
  return groups;
}
