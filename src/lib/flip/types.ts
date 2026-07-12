export const FLIP_CATEGORIES = ["Watches", "Phones", "Laptops"] as const;
export type FlipCategory = (typeof FLIP_CATEGORIES)[number] | "all";

export type FlipFeeSettings = {
  /** eBay + managed payments final value fee as a fraction of sale price */
  feeRate: number;
  /** Typical inbound postage / collection cost (£) */
  inboundShipping: number;
  /** Typical outbound postage when reselling (£) */
  outboundShipping: number;
};

export const DEFAULT_FLIP_FEES: FlipFeeSettings = {
  feeRate: 0.129,
  inboundShipping: 5,
  outboundShipping: 8,
};

export type FlipOpportunity = {
  id: string;
  title: string;
  category: Exclude<FlipCategory, "all">;
  brand: string | null;
  imageUrl: string | null;
  ebayUrl: string;
  location: string | null;
  buyingType: "Auction" | "Buy it now" | "Best offer";
  currentPrice: number;
  currency: string;
  endsAt: string | null;
  endsInMinutes: number | null;
  marketValue: number;
  marketSource: "comps" | "heuristic";
  compCount: number;
  fees: number;
  totalCost: number;
  netProfit: number;
  roiPct: number;
  confidence: number;
  riskFlags: string[];
  why: string[];
  /** Suggested max bid to still hit the user's min profit */
  maxBid: number;
};
