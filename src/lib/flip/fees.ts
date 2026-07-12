import type { FlipFeeSettings } from "@/lib/flip/types";

export function saleFees(salePrice: number, fees: FlipFeeSettings): number {
  return Math.round(salePrice * fees.feeRate * 100) / 100;
}

export function totalAcquisitionCost(buyPrice: number, fees: FlipFeeSettings): number {
  return Math.round((buyPrice + fees.inboundShipping) * 100) / 100;
}

export function netProfitAfterFlip(buyPrice: number, marketValue: number, fees: FlipFeeSettings): number {
  const cost = totalAcquisitionCost(buyPrice, fees);
  const outFees = saleFees(marketValue, fees) + fees.outboundShipping;
  return Math.round((marketValue - cost - outFees) * 100) / 100;
}

/** Highest bid that still leaves at least `minProfit` after fees. */
export function maxBidForProfit(marketValue: number, minProfit: number, fees: FlipFeeSettings): number {
  const outFees = saleFees(marketValue, fees) + fees.outboundShipping;
  const max = marketValue - outFees - fees.inboundShipping - minProfit;
  return Math.max(0, Math.round(max * 100) / 100);
}

export function roiPct(netProfit: number, buyPrice: number, fees: FlipFeeSettings): number {
  const invested = totalAcquisitionCost(buyPrice, fees);
  if (invested <= 0) return 0;
  return Math.round((netProfit / invested) * 1000) / 10;
}
