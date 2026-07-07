import type { FavouriteItem } from "@/lib/favourites";
import {
  analyzeJob,
  profitAtPayment,
  type JobIntelInput,
  type JobIntelSettings,
} from "@/lib/shiply/intelligence";

export type JobProfitResult = {
  profit: number;
  label: "est" | "actual";
  hourlyRate: number | null;
  payment: number;
};

export type ShiplyJobLookup = {
  miles: number | null;
  quotes: number | null;
  service: string;
};

export function intelInputForJob(
  item: FavouriteItem,
  shiplyLookup?: Map<string, ShiplyJobLookup>,
): JobIntelInput | null {
  const service = item.service || "Other";
  let miles = item.miles;
  let quotes = item.quotes;

  if (item.source === "shiply" && shiplyLookup?.has(item.sourceId)) {
    const row = shiplyLookup.get(item.sourceId)!;
    miles = miles ?? row.miles;
    quotes = quotes ?? row.quotes;
  }

  if (miles == null || miles < 1) return null;
  return { miles, quotes, service };
}

export function profitForJob(
  item: FavouriteItem,
  settings?: JobIntelSettings,
  shiplyLookup?: Map<string, ShiplyJobLookup>,
): JobProfitResult | null {
  const input = intelInputForJob(item, shiplyLookup);
  if (!input) return null;

  if ((item.status === "won" || item.status === "completed") && item.actualBid != null && item.actualBid > 0) {
    const atPay = profitAtPayment(item.actualBid, input, settings);
    if (!atPay) return null;
    return {
      profit: atPay.profit,
      label: "actual",
      hourlyRate: atPay.hourlyRate,
      payment: item.actualBid,
    };
  }

  const intel = analyzeJob(input, settings);
  if (!intel) return null;
  return {
    profit: intel.profitAtBid,
    label: "est",
    hourlyRate: intel.hourlyRate,
    payment: intel.suggestedBid,
  };
}

export function sumJobProfits(
  items: FavouriteItem[],
  settings?: JobIntelSettings,
  shiplyLookup?: Map<string, ShiplyJobLookup>,
): { total: number; count: number; withProfit: number } {
  let total = 0;
  let withProfit = 0;
  for (const item of items) {
    const p = profitForJob(item, settings, shiplyLookup);
    if (!p) continue;
    withProfit++;
    total += p.profit;
  }
  return { total, count: items.length, withProfit };
}

export type EarningsWindow = {
  profit: number;
  jobs: number;
  miles: number;
};

export type EarningsSummary = {
  week: EarningsWindow;
  month: EarningsWindow;
  allTime: EarningsWindow;
  upcoming: EarningsWindow;
};

const emptyWindow = (): EarningsWindow => ({ profit: 0, jobs: 0, miles: 0 });

/**
 * Earnings from completed jobs by time window (based on completedAt), plus
 * an "upcoming" window for won-but-not-completed work still to supply.
 */
export function earningsSummary(
  items: FavouriteItem[],
  settings?: JobIntelSettings,
  shiplyLookup?: Map<string, ShiplyJobLookup>,
  now: number = Date.now(),
): EarningsSummary {
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const monthStart = new Date(now);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthStartMs = monthStart.getTime();

  const summary: EarningsSummary = {
    week: emptyWindow(),
    month: emptyWindow(),
    allTime: emptyWindow(),
    upcoming: emptyWindow(),
  };

  for (const item of items) {
    const p = profitForJob(item, settings, shiplyLookup);
    if (!p) continue;
    const miles = item.miles ?? 0;

    if (item.status === "won") {
      summary.upcoming.profit += p.profit;
      summary.upcoming.jobs += 1;
      summary.upcoming.miles += miles;
      continue;
    }

    if (item.status !== "completed") continue;
    const when = item.completedAt ?? item.wonAt ?? item.savedAt;

    summary.allTime.profit += p.profit;
    summary.allTime.jobs += 1;
    summary.allTime.miles += miles;

    if (when >= monthStartMs) {
      summary.month.profit += p.profit;
      summary.month.jobs += 1;
      summary.month.miles += miles;
    }
    if (when >= weekAgo) {
      summary.week.profit += p.profit;
      summary.week.jobs += 1;
      summary.week.miles += miles;
    }
  }

  return summary;
}
