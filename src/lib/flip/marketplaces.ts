import type { FlipCategoryName, MarketplaceEstimate } from "@/lib/flip/types";

type Channel = {
  id: string;
  name: string;
  /** Multiplier vs eBay BIN market value */
  priceMult: number;
  /** Selling fee as fraction of sale price (0 for FB local) */
  feeRate: number;
  /** Extra outbound cost beyond default postage */
  extraCost: number;
  speed: "fast" | "medium" | "slow";
  feeNote: string;
  categories?: FlipCategoryName[]; // if set, only these
};

const CHANNELS: Channel[] = [
  {
    id: "ebay",
    name: "eBay BIN",
    priceMult: 1,
    feeRate: 0.129,
    extraCost: 0,
    speed: "fast",
    feeNote: "~12.9% fees + postage",
  },
  {
    id: "amazon",
    name: "Amazon",
    priceMult: 1.12,
    feeRate: 0.15,
    extraCost: 3,
    speed: "medium",
    feeNote: "~15% referral + FBM postage",
    categories: ["Phones", "Laptops", "iPads", "Graphics Cards", "Gaming Consoles", "Apple Watches"],
  },
  {
    id: "facebook",
    name: "Facebook Marketplace",
    priceMult: 0.95,
    feeRate: 0,
    extraCost: 0,
    speed: "medium",
    feeNote: "No selling fees · local collection",
    categories: ["Power Tools", "Laptops", "Gaming Consoles", "Cameras", "Musical Gear", "Drones"],
  },
  {
    id: "chrono24",
    name: "Chrono24",
    priceMult: 1.15,
    feeRate: 0.065,
    extraCost: 15,
    speed: "slow",
    feeNote: "~6.5% + insured postage",
    categories: ["Watches"],
  },
  {
    id: "reverb",
    name: "Reverb",
    priceMult: 1.1,
    feeRate: 0.059,
    extraCost: 8,
    speed: "medium",
    feeNote: "~5.9% + postage",
    categories: ["Musical Gear"],
  },
  {
    id: "stockx",
    name: "StockX",
    priceMult: 1.08,
    feeRate: 0.1,
    extraCost: 5,
    speed: "medium",
    feeNote: "~10% + shipping",
    categories: ["Sneakers"],
  },
  {
    id: "backmarket",
    name: "Back Market",
    priceMult: 1.08,
    feeRate: 0.12,
    extraCost: 4,
    speed: "medium",
    feeNote: "~12% refurbished channel",
    categories: ["Phones", "Laptops", "iPads", "Apple Watches"],
  },
  {
    id: "mpb",
    name: "MPB / WEX",
    priceMult: 0.92,
    feeRate: 0,
    extraCost: 0,
    speed: "fast",
    feeNote: "Trade-in quote · fast cash",
    categories: ["Cameras", "Camera Lenses"],
  },
];

export function estimateSellMarkets(opts: {
  category: FlipCategoryName;
  ebayMarketValue: number;
  totalCost: number;
  outboundShipping: number;
}): { markets: MarketplaceEstimate[]; bestSellMarket: string } {
  const markets: MarketplaceEstimate[] = [];

  for (const ch of CHANNELS) {
    if (ch.categories && !ch.categories.includes(opts.category)) continue;
    const salePrice = Math.round(opts.ebayMarketValue * ch.priceMult);
    const fees = salePrice * ch.feeRate;
    const ship = ch.id === "facebook" ? 0 : opts.outboundShipping + ch.extraCost;
    const netProfit = Math.round((salePrice - opts.totalCost - fees - ship) * 100) / 100;
    markets.push({
      id: ch.id,
      name: ch.name,
      salePrice,
      netProfit,
      feeNote: ch.feeNote,
      speed: ch.speed,
    });
  }

  markets.sort((a, b) => b.netProfit - a.netProfit);
  return {
    markets: markets.slice(0, 4),
    bestSellMarket: markets[0]?.name ?? "eBay BIN",
  };
}
