import type { FlipCategory } from "@/lib/flip/types";

type BrandBand = {
  brand: string;
  re: RegExp;
  /** Typical UK private-sale / used resale midpoint (£) when model unknown */
  mid: number;
  /** Floor / ceiling for confidence banding */
  low: number;
  high: number;
};

const WATCH_BRANDS: BrandBand[] = [
  { brand: "Rolex", re: /\brolex\b/i, mid: 5500, low: 2500, high: 14000 },
  { brand: "Patek Philippe", re: /\bpatek\b/i, mid: 18000, low: 8000, high: 45000 },
  { brand: "Audemars Piguet", re: /\baudemars|\bap royal\b/i, mid: 22000, low: 10000, high: 50000 },
  { brand: "Omega", re: /\bomega\b/i, mid: 1800, low: 500, high: 4500 },
  { brand: "Cartier", re: /\bcartier\b/i, mid: 2800, low: 900, high: 8000 },
  { brand: "Breitling", re: /\bbreitling\b/i, mid: 2200, low: 700, high: 5500 },
  { brand: "IWC", re: /\biwc\b/i, mid: 3200, low: 1200, high: 7000 },
  { brand: "Panerai", re: /\bpanerai\b/i, mid: 3500, low: 1500, high: 8000 },
  { brand: "Zenith", re: /\bzenith\b/i, mid: 2800, low: 1000, high: 6500 },
  { brand: "Tag Heuer", re: /\btag\s*heuer\b|\bheuer\b/i, mid: 750, low: 250, high: 2200 },
  { brand: "Tudor", re: /\btudor\b/i, mid: 1800, low: 700, high: 4000 },
  { brand: "Oris", re: /\boris\b/i, mid: 650, low: 250, high: 1600 },
  { brand: "Longines", re: /\blongines\b/i, mid: 650, low: 250, high: 1600 },
  { brand: "Hamilton", re: /\bhamilton\b/i, mid: 420, low: 150, high: 1100 },
  { brand: "Tissot", re: /\btissot\b/i, mid: 280, low: 100, high: 700 },
  { brand: "Certina", re: /\bcertina\b/i, mid: 220, low: 80, high: 550 },
  { brand: "Raymond Weil", re: /\braymond\s*weil\b/i, mid: 350, low: 120, high: 900 },
  { brand: "Seiko", re: /\bseiko\b/i, mid: 180, low: 40, high: 900 },
  { brand: "Citizen", re: /\bcitizen\b/i, mid: 90, low: 30, high: 350 },
  { brand: "Orient", re: /\borient\b/i, mid: 120, low: 40, high: 350 },
  { brand: "Casio", re: /\bcasio\b|\bg[- ]?shock\b/i, mid: 70, low: 20, high: 250 },
  { brand: "Bulova", re: /\bbulova\b/i, mid: 120, low: 40, high: 400 },
  { brand: "Timex", re: /\btimex\b/i, mid: 45, low: 15, high: 150 },
  { brand: "Rotary", re: /\brotary\b/i, mid: 80, low: 25, high: 250 },
  { brand: "Sekonda", re: /\bsekonda\b/i, mid: 35, low: 10, high: 100 },
  { brand: "Ingersoll", re: /\bingersoll\b/i, mid: 60, low: 20, high: 180 },
  { brand: "Swatch", re: /\bswatch\b/i, mid: 55, low: 15, high: 180 },
  { brand: "Fossil", re: /\bfossil\b/i, mid: 45, low: 15, high: 120 },
  { brand: "Michael Kors", re: /\bmichael\s*kors\b|\bmk\b.*\bwatch\b/i, mid: 70, low: 25, high: 180 },
];

/** Brands we actively search on eBay (quality > random ending-soon junk). */
export const WATCH_SEARCH_BRANDS = [
  "Rolex",
  "Omega",
  "Cartier",
  "Breitling",
  "Tag Heuer",
  "Tudor",
  "Oris",
  "Longines",
  "Hamilton",
  "Tissot",
  "Seiko",
  "Citizen",
  "Casio",
  "Orient",
] as const;

const PHONE_BRANDS: BrandBand[] = [
  { brand: "iPhone 16 Pro", re: /\biphone\s*16\s*pro\b/i, mid: 850, low: 650, high: 1100 },
  { brand: "iPhone 16", re: /\biphone\s*16\b/i, mid: 650, low: 480, high: 850 },
  { brand: "iPhone 15 Pro", re: /\biphone\s*15\s*pro\b/i, mid: 700, low: 520, high: 950 },
  { brand: "iPhone 15", re: /\biphone\s*15\b/i, mid: 480, low: 350, high: 650 },
  { brand: "iPhone 14 Pro", re: /\biphone\s*14\s*pro\b/i, mid: 480, low: 350, high: 650 },
  { brand: "iPhone 14", re: /\biphone\s*14\b/i, mid: 320, low: 220, high: 450 },
  { brand: "iPhone 13", re: /\biphone\s*13\b/i, mid: 230, low: 150, high: 350 },
  { brand: "iPhone 12", re: /\biphone\s*12\b/i, mid: 160, low: 100, high: 250 },
  { brand: "Samsung S24", re: /\bgalaxy\s*s24\b|\bs24\s*ultra\b/i, mid: 450, low: 300, high: 700 },
  { brand: "Samsung S23", re: /\bgalaxy\s*s23\b|\bs23\s*ultra\b/i, mid: 300, low: 180, high: 480 },
  { brand: "Google Pixel", re: /\bpixel\s*(8|9)\b/i, mid: 280, low: 150, high: 500 },
];

const LAPTOP_BRANDS: BrandBand[] = [
  { brand: "MacBook Pro 16", re: /\bmacbook\s*pro\s*16\b/i, mid: 1400, low: 900, high: 2200 },
  { brand: "MacBook Pro 14", re: /\bmacbook\s*pro\s*14\b/i, mid: 1100, low: 700, high: 1800 },
  { brand: "MacBook Pro", re: /\bmacbook\s*pro\b/i, mid: 750, low: 350, high: 1500 },
  { brand: "MacBook Air M3", re: /\bmacbook\s*air\s*m3\b/i, mid: 750, low: 550, high: 1000 },
  { brand: "MacBook Air M2", re: /\bmacbook\s*air\s*m2\b/i, mid: 550, low: 380, high: 750 },
  { brand: "MacBook Air", re: /\bmacbook\s*air\b/i, mid: 420, low: 200, high: 700 },
  { brand: "ThinkPad", re: /\bthinkpad\b/i, mid: 280, low: 100, high: 700 },
  { brand: "Dell XPS", re: /\bxps\s*1[35]\b|\bdell\s*xps\b/i, mid: 450, low: 200, high: 900 },
  { brand: "Surface Laptop", re: /\bsurface\s*(laptop|pro)\b/i, mid: 350, low: 150, high: 800 },
];

function bandsFor(category: Exclude<FlipCategory, "all">): BrandBand[] {
  if (category === "Watches") return WATCH_BRANDS;
  if (category === "Phones") return PHONE_BRANDS;
  return LAPTOP_BRANDS;
}

export function matchBrand(title: string, category: Exclude<FlipCategory, "all">): BrandBand | null {
  if (category === "Watches") {
    // Vintage "Rolex Tudor" titles are Tudors — don't value them as Rolex.
    if (/\btudor\b/i.test(title)) {
      const tudor = WATCH_BRANDS.find((b) => b.brand === "Tudor");
      if (tudor) return tudor;
    }
    // "Tissot … (Omega calibre)" should stay Tissot.
    if (/\btissot\b/i.test(title)) {
      const tissot = WATCH_BRANDS.find((b) => b.brand === "Tissot");
      if (tissot) return tissot;
    }
  }
  for (const b of bandsFor(category)) {
    if (b.re.test(title)) return b;
  }
  return null;
}

export function heuristicMarketValue(
  title: string,
  category: Exclude<FlipCategory, "all">,
  currentPrice: number,
): { brand: string | null; marketValue: number; confidence: number } {
  const band = matchBrand(title, category);
  if (!band) {
    // Unknown brand — assume thin margin only if price is already low vs category floor
    const fallback = category === "Watches" ? 80 : category === "Phones" ? 120 : 200;
    const marketValue = Math.max(currentPrice * 1.15, fallback * 0.6);
    return { brand: null, marketValue: Math.round(marketValue), confidence: 25 };
  }

  // Bias toward mid, but if current bid is already near high, don't invent huge upside
  let marketValue = band.mid;
  if (currentPrice > band.mid) {
    marketValue = Math.min(band.high, Math.max(band.mid, currentPrice * 1.08));
  } else if (currentPrice < band.low * 0.5) {
    // Suspiciously cheap — keep mid but confidence will drop via risk/comps later
    marketValue = band.mid;
  }

  const span = band.high - band.low || 1;
  const proximity = 1 - Math.min(1, Math.abs(marketValue - band.mid) / span);
  const confidence = Math.round(45 + proximity * 25);

  return { brand: band.brand, marketValue: Math.round(marketValue), confidence };
}

/** Keywords for similar Buy-It-Now comps search. */
export function compsQuery(title: string, brand: string | null): string {
  const cleaned = title
    .replace(/[^\w\s+-]/g, " ")
    .replace(/\b(genuine|authentic|rare|boxed|warranty|uk|seller|fast|postage|new|used|excellent)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (brand) {
    const after = cleaned.replace(new RegExp(brand, "i"), "").trim();
    const tokens = after.split(" ").filter((t) => t.length > 1).slice(0, 4);
    return [brand, ...tokens].join(" ").slice(0, 80);
  }
  return cleaned.split(" ").slice(0, 6).join(" ");
}
