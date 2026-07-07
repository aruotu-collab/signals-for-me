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
