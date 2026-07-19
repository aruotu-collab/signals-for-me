import { ebayBrowse } from "@/lib/ebay/client";
import type { EbayItemSummary } from "@/lib/ebay/search";
import {
  estimateInboundFreightGbp,
  searchCjProducts,
  usdToGbp,
  type CjProduct,
  isCjConfigured,
} from "@/lib/cj/client";
import type { SourceOpportunity, SourceScanResult } from "@/lib/source/types";

const EBAY_FEE_RATE = 0.129;
const OUTBOUND_POSTAGE = 3.5;

const SEED_QUERIES = [
  "pet hair remover",
  "portable blender",
  "led garage light",
  "mini chainsaw",
  "car vacuum",
  "phone holder car",
  "magnetic cable",
  "kitchen gadget",
  "massage gun",
  "led strip light",
  "wireless earbuds",
  "camping lantern",
];

const STOP_WORDS = new Set([
  "new",
  "hot",
  "sale",
  "wholesale",
  "dropshipping",
  "free",
  "shipping",
  "uk",
  "eu",
  "us",
  "for",
  "with",
  "and",
  "the",
  "a",
  "an",
  "of",
  "to",
  "in",
  "on",
  "by",
  "from",
  "set",
  "pack",
  "pcs",
  "piece",
  "pieces",
  "type",
  "style",
  "fashion",
  "women",
  "men",
  "unisex",
  "high",
  "quality",
  "portable",
  "wireless",
  "intelligent",
  "electric",
]);

type EbaySearchResponse = {
  itemSummaries?: EbayItemSummary[];
  total?: number;
};

function cleanSearchQuery(title: string): string {
  const words = title
    .replace(/[^\w\s+-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w.toLowerCase()));

  // Prefer distinctive mid-title terms over long marketing fluff.
  return words.slice(0, 6).join(" ");
}

function median(nums: number[]): number | null {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

async function ebayDemandFor(title: string): Promise<{
  medianAsk: number | null;
  sampleCount: number;
  activeCount: number;
}> {
  const q = cleanSearchQuery(title);
  if (q.length < 3) return { medianAsk: null, sampleCount: 0, activeCount: 0 };

  // Ship-to GB, not "located in GB" — dropship comps are often listed from CN/EU.
  const params = new URLSearchParams({
    q,
    limit: "20",
    filter: "buyingOptions:{FIXED_PRICE},deliveryCountry:GB,price:[3..400],conditions:{1000|1500|2000|2500|3000|4000|5000}",
    sort: "price",
  });

  try {
    const data = await ebayBrowse<EbaySearchResponse>(`/buy/browse/v1/item_summary/search?${params}`);
    const prices: number[] = [];
    for (const item of data.itemSummaries ?? []) {
      const v = item.price?.value ? Number.parseFloat(item.price.value) : NaN;
      if (Number.isFinite(v) && v > 0) prices.push(v);
    }
    return {
      medianAsk: median(prices),
      sampleCount: prices.length,
      activeCount: Math.max(prices.length, data.total ?? 0),
    };
  } catch {
    return { medianAsk: null, sampleCount: 0, activeCount: 0 };
  }
}

function competitionLabel(active: number): SourceOpportunity["competitionLabel"] {
  if (active <= 25) return "low";
  if (active <= 100) return "medium";
  return "high";
}

function scoreOpportunity(input: {
  netProfit: number;
  roiPct: number;
  activeCount: number;
  cjListedNum: number | null;
  sampleCount: number;
}): {
  score: number;
  band: SourceOpportunity["band"];
  estimatedDaysToSell: number;
  profitPerDay: number;
  reasons: string[];
} {
  const reasons: string[] = [];
  let score = 35;

  if (input.netProfit >= 20) {
    score += 25;
    reasons.push(`Strong net ~£${Math.round(input.netProfit)}`);
  } else if (input.netProfit >= 12) {
    score += 18;
  } else if (input.netProfit >= 7) {
    score += 10;
  } else if (input.netProfit >= 4) {
    score += 4;
  } else {
    score -= 10;
  }

  if (input.roiPct >= 60) score += 12;
  else if (input.roiPct >= 35) score += 8;
  else if (input.roiPct >= 20) score += 4;

  if (input.activeCount <= 15) {
    score += 18;
    reasons.push("Low eBay competition");
  } else if (input.activeCount <= 40) {
    score += 10;
  } else if (input.activeCount <= 100) {
    score += 2;
  } else if (input.activeCount <= 250) {
    score -= 10;
    reasons.push("Crowded eBay niche");
  } else {
    score -= 22;
    reasons.push("Very crowded eBay niche");
  }

  if (input.cjListedNum != null) {
    if (input.cjListedNum >= 500) {
      score += 10;
      reasons.push("High CJ listing activity");
    } else if (input.cjListedNum >= 100) {
      score += 6;
    } else if (input.cjListedNum < 10) {
      score -= 4;
    }
  }

  if (input.sampleCount < 3) {
    score -= 8;
    reasons.push("Thin eBay price sample — verify sold comps");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const band: SourceOpportunity["band"] =
    score >= 80 ? "hot" : score >= 65 ? "good" : score >= 45 ? "watch" : "skip";

  const competitionFactor =
    input.activeCount >= 250 ? 2.4 : input.activeCount >= 100 ? 1.8 : input.activeCount >= 40 ? 1.3 : 0.85;
  const popularityFactor =
    input.cjListedNum != null && input.cjListedNum >= 200
      ? 0.75
      : input.cjListedNum != null && input.cjListedNum < 20
        ? 1.35
        : 1;
  const estimatedDaysToSell = Math.max(1, Math.min(60, Math.round(8 * competitionFactor * popularityFactor)));
  const profitPerDay = Math.round((input.netProfit / estimatedDaysToSell) * 100) / 100;

  return { score, band, estimatedDaysToSell, profitPerDay, reasons };
}

function scoreProduct(
  product: CjProduct,
  demand: { medianAsk: number | null; sampleCount: number; activeCount: number },
): SourceOpportunity | null {
  if (demand.medianAsk == null || demand.sampleCount < 1) return null;

  const productCostGbp = usdToGbp(product.sellPriceUsd);
  const freightGbp = estimateInboundFreightGbp(product.weightGrams, product.sellPriceUsd);
  const supplierCostGbp = Math.round((productCostGbp + freightGbp) * 100) / 100;

  const askMult =
    demand.activeCount >= 200 ? 0.72 : demand.activeCount >= 80 ? 0.8 : demand.activeCount >= 30 ? 0.88 : 0.94;
  const ebayMarketGbp = Math.round(demand.medianAsk * askMult * 100) / 100;
  const feesGbp = Math.round((ebayMarketGbp * EBAY_FEE_RATE + OUTBOUND_POSTAGE) * 100) / 100;
  const netProfitGbp = Math.round((ebayMarketGbp - supplierCostGbp - feesGbp) * 100) / 100;
  if (netProfitGbp < 3) return null;

  const roiPct = Math.round((netProfitGbp / supplierCostGbp) * 1000) / 10;
  const scored = scoreOpportunity({
    netProfit: netProfitGbp,
    roiPct,
    activeCount: demand.activeCount,
    cjListedNum: product.listedNum,
    sampleCount: demand.sampleCount,
  });
  if (scored.band === "skip" && scored.score < 35) return null;

  const q = cleanSearchQuery(product.name);
  const why = [
    `Opportunity ${scored.score}/100 — ${scored.band}`,
    `CJ cost ~£${supplierCostGbp} (product £${productCostGbp} + freight £${freightGbp})`,
    `eBay risk-adjusted ask ~£${ebayMarketGbp} from ${demand.sampleCount} active BINs`,
    `Est. ~${scored.estimatedDaysToSell} days · £${scored.profitPerDay}/day`,
    ...scored.reasons.slice(0, 2),
  ];

  return {
    id: product.id,
    supplier: "cj",
    title: product.name,
    imageUrl: product.imageUrl,
    supplierUrl: product.productUrl,
    sku: product.sku,
    categoryName: product.categoryName,
    warehouse: product.warehouse,
    supplierCostGbp,
    productCostGbp,
    freightGbp,
    ebayMarketGbp,
    ebayActiveCount: demand.activeCount,
    ebaySampleCount: demand.sampleCount,
    cjListedNum: product.listedNum,
    feesGbp,
    netProfitGbp,
    roiPct,
    opportunityScore: scored.score,
    band: scored.band,
    estimatedDaysToSell: scored.estimatedDaysToSell,
    profitPerDay: scored.profitPerDay,
    competitionLabel: competitionLabel(demand.activeCount),
    why,
    ebaySearchUrl: `https://www.ebay.co.uk/sch/i.html?_nkw=${encodeURIComponent(q)}&_sacat=0&LH_BIN=1&rt=nc`,
  };
}

async function mapPool<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]!);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return out;
}

export async function findSourceOpportunities(opts?: {
  minProfit?: number;
  maxDaysToSell?: number;
  limit?: number;
}): Promise<SourceScanResult> {
  if (!isCjConfigured()) {
    return { opportunities: [], scanned: 0, matched: 0, filteredOut: 0, source: "unconfigured", supplier: "cj" };
  }

  const minProfit = opts?.minProfit ?? 7;
  const maxDays = opts?.maxDaysToSell && opts.maxDaysToSell > 0 ? opts.maxDaysToSell : null;
  const limit = Math.min(40, opts?.limit ?? 24);

  try {
    const seen = new Set<string>();
    const products: CjProduct[] = [];

    const batches = await Promise.all([
      searchCjProducts({ trending: true, size: 40 }).catch(() => [] as CjProduct[]),
      ...SEED_QUERIES.map((q) => searchCjProducts({ keyWord: q, size: 10 }).catch(() => [] as CjProduct[])),
    ]);

    for (const batch of batches) {
      for (const p of batch) {
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        products.push(p);
      }
    }

    const toCheck = products
      .sort((a, b) => (b.listedNum ?? 0) - (a.listedNum ?? 0))
      .slice(0, 48);

    const scored = await mapPool(toCheck, 6, async (product) => {
      const demand = await ebayDemandFor(product.name);
      return scoreProduct(product, demand);
    });

    const matchedList = scored.filter((o): o is SourceOpportunity => Boolean(o));
    const opportunities: SourceOpportunity[] = [];
    for (const opp of matchedList) {
      if (opp.netProfitGbp < minProfit) continue;
      if (maxDays != null && opp.estimatedDaysToSell > maxDays) continue;
      opportunities.push(opp);
    }

    opportunities.sort(
      (a, b) =>
        b.profitPerDay - a.profitPerDay ||
        b.opportunityScore - a.opportunityScore ||
        b.netProfitGbp - a.netProfitGbp,
    );

    return {
      opportunities: opportunities.slice(0, limit),
      scanned: toCheck.length,
      matched: matchedList.length,
      filteredOut: matchedList.length - opportunities.length,
      source: "live",
      supplier: "cj",
    };
  } catch (e) {
    return {
      opportunities: [],
      scanned: 0,
      matched: 0,
      filteredOut: 0,
      source: "error",
      supplier: "cj",
      error: e instanceof Error ? e.message : "CJ scan failed",
    };
  }
}
