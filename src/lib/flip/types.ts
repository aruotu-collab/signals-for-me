export const FLIP_CATEGORIES = [
  "Watches",
  "Phones",
  "Laptops",
  "Power Tools",
  "Cameras",
  "Camera Lenses",
  "Graphics Cards",
  "Gaming Consoles",
  "iPads",
  "Apple Watches",
  "Drones",
  "LEGO",
  "Musical Gear",
  "Sneakers",
] as const;

export type FlipCategoryName = (typeof FLIP_CATEGORIES)[number];
export type FlipCategory = FlipCategoryName | "all";

/** Priority order from the opportunity brief — used when scanning "all". */
export const FLIP_SCAN_PRIORITY: FlipCategoryName[] = [
  "Power Tools",
  "Cameras",
  "Camera Lenses",
  "Graphics Cards",
  "Gaming Consoles",
  "iPads",
  "Apple Watches",
  "Drones",
  "LEGO",
  "Musical Gear",
  "Watches",
  "Phones",
  "Laptops",
  "Sneakers",
];

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

export type DealScoreBand = "buy" | "good" | "watch" | "low";

export type MarketplaceEstimate = {
  id: string;
  name: string;
  salePrice: number;
  netProfit: number;
  feeNote: string;
  speed: "fast" | "medium" | "slow";
};

export type FlipOpportunity = {
  id: string;
  title: string;
  category: FlipCategoryName;
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
  /** 0–100 composite deal quality */
  dealScore: number;
  dealBand: DealScoreBand;
  dealLabel: string;
  riskFlags: string[];
  why: string[];
  /** Suggested max bid to still hit the user's min profit */
  maxBid: number;
  /** Where to sell for best net (eBay + alternatives) */
  sellMarkets: MarketplaceEstimate[];
  bestSellMarket: string;
};
