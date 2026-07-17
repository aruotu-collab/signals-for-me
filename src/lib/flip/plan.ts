import type { FlipOpportunity } from "@/lib/flip/types";

export type CapitalPlan = {
  mode: "budget" | "monthly";
  budget: number;
  monthlyGoal: number | null;
  startingCapital: number | null;
  selected: FlipOpportunity[];
  totalSpend: number;
  totalProfit: number;
  leftover: number;
  flipsNeeded: number | null;
  avgProfit: number;
  weeksEstimate: number | null;
  summary: string;
};

/** Greedy pack: highest Deal Score first, while spend stays within budget. */
export function packWithinBudget(opportunities: FlipOpportunity[], budget: number): {
  selected: FlipOpportunity[];
  totalSpend: number;
  totalProfit: number;
  leftover: number;
} {
  const cap = Math.max(0, budget);
  const selected: FlipOpportunity[] = [];
  let spend = 0;
  let profit = 0;

  for (const opp of opportunities) {
    const cost = opp.currentPrice;
    if (cost <= 0 || cost > cap) continue;
    if (spend + cost > cap) continue;
    selected.push(opp);
    spend += cost;
    profit += opp.netProfit;
  }

  return {
    selected,
    totalSpend: Math.round(spend * 100) / 100,
    totalProfit: Math.round(profit * 100) / 100,
    leftover: Math.round((cap - spend) * 100) / 100,
  };
}

export function buildBudgetPlan(opportunities: FlipOpportunity[], budget: number): CapitalPlan {
  const pack = packWithinBudget(opportunities, budget);
  const avg =
    pack.selected.length > 0 ? Math.round((pack.totalProfit / pack.selected.length) * 100) / 100 : 0;

  const summary =
    pack.selected.length === 0
      ? `No deals currently fit a £${budget.toLocaleString("en-GB")} buy budget at your filters.`
      : `With £${budget.toLocaleString("en-GB")} you could bid on ${pack.selected.length} deal${
          pack.selected.length === 1 ? "" : "s"
        } (~£${pack.totalSpend.toLocaleString("en-GB")} spent) for ~£${pack.totalProfit.toLocaleString(
          "en-GB",
        )} estimated net if they all clear.`;

  return {
    mode: "budget",
    budget,
    monthlyGoal: null,
    startingCapital: null,
    selected: pack.selected,
    totalSpend: pack.totalSpend,
    totalProfit: pack.totalProfit,
    leftover: pack.leftover,
    flipsNeeded: null,
    avgProfit: avg,
    weeksEstimate: null,
    summary,
  };
}

/**
 * Monthly target + starting capital: only deals you can afford now,
 * then estimate how many successful flips (recycling capital) to hit the goal.
 */
export function buildMonthlyPlan(
  opportunities: FlipOpportunity[],
  opts: { monthlyGoal: number; startingCapital: number },
): CapitalPlan {
  const goal = Math.max(0, opts.monthlyGoal);
  const capital = Math.max(0, opts.startingCapital);
  const affordable = opportunities.filter((o) => o.currentPrice <= capital);
  const pack = packWithinBudget(affordable, capital);
  const avg =
    affordable.length > 0
      ? Math.round((affordable.reduce((s, o) => s + o.netProfit, 0) / affordable.length) * 100) / 100
      : 0;

  const flipsNeeded = avg > 0 ? Math.ceil(goal / avg) : null;
  // Assume ~2 successful flips per week when sourcing actively.
  const weeksEstimate = flipsNeeded != null ? Math.max(1, Math.ceil(flipsNeeded / 2)) : null;

  let summary: string;
  if (capital <= 0 || goal <= 0) {
    summary = "Enter a monthly profit target and how much you can start with.";
  } else if (affordable.length === 0) {
    summary = `No deals under your £${capital.toLocaleString("en-GB")} starting capital right now. Try a wider category or lower min profit.`;
  } else if (flipsNeeded == null) {
    summary = `Found ${affordable.length} affordable deals, but profit estimates are too low to plan a path.`;
  } else {
    summary = `Start with £${capital.toLocaleString("en-GB")}. Avg deal ~£${avg.toLocaleString(
      "en-GB",
    )} net → about ${flipsNeeded} successful flip${flipsNeeded === 1 ? "" : "s"} to hit £${goal.toLocaleString(
      "en-GB",
    )}/month (~${weeksEstimate} week${weeksEstimate === 1 ? "" : "s"} at 2 clears/week). Recycle winnings into the next buy.`;
  }

  return {
    mode: "monthly",
    budget: capital,
    monthlyGoal: goal,
    startingCapital: capital,
    selected: pack.selected,
    totalSpend: pack.totalSpend,
    totalProfit: pack.totalProfit,
    leftover: pack.leftover,
    flipsNeeded,
    avgProfit: avg,
    weeksEstimate,
    summary,
  };
}
