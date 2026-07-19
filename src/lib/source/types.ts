export type SourceOpportunity = {
  id: string;
  supplier: "cj";
  title: string;
  imageUrl: string | null;
  supplierUrl: string | null;
  sku: string;
  categoryName: string | null;
  warehouse: string | null;
  /** CJ cost in GBP including estimated inbound postage */
  supplierCostGbp: number;
  productCostGbp: number;
  freightGbp: number;
  /** Risk-adjusted eBay ask / resale estimate */
  ebayMarketGbp: number;
  ebayActiveCount: number;
  ebaySampleCount: number;
  cjListedNum: number | null;
  feesGbp: number;
  netProfitGbp: number;
  roiPct: number;
  opportunityScore: number;
  band: "hot" | "good" | "watch" | "skip";
  estimatedDaysToSell: number;
  profitPerDay: number;
  competitionLabel: "low" | "medium" | "high";
  why: string[];
  ebaySearchUrl: string;
};

export type SourceScanResult = {
  opportunities: SourceOpportunity[];
  scanned: number;
  source: "live" | "unconfigured" | "error";
  supplier: "cj";
  error?: string;
};
