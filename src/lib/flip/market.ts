import type { FlipCategoryName } from "@/lib/flip/types";

export type BrandBand = {
  brand: string;
  re: RegExp;
  mid: number;
  low: number;
  high: number;
};

const WATCH_BRANDS: BrandBand[] = [
  { brand: "Rolex", re: /\brolex\b/i, mid: 5500, low: 2500, high: 14000 },
  { brand: "Omega", re: /\bomega\b/i, mid: 1800, low: 500, high: 4500 },
  { brand: "Cartier", re: /\bcartier\b/i, mid: 2800, low: 900, high: 8000 },
  { brand: "Breitling", re: /\bbreitling\b/i, mid: 2200, low: 700, high: 5500 },
  { brand: "Tag Heuer", re: /\btag\s*heuer\b|\bheuer\b/i, mid: 750, low: 250, high: 2200 },
  { brand: "Tudor", re: /\btudor\b/i, mid: 1800, low: 700, high: 4000 },
  { brand: "Oris", re: /\boris\b/i, mid: 650, low: 250, high: 1600 },
  { brand: "Longines", re: /\blongines\b/i, mid: 650, low: 250, high: 1600 },
  { brand: "Hamilton", re: /\bhamilton\b/i, mid: 420, low: 150, high: 1100 },
  { brand: "Tissot", re: /\btissot\b/i, mid: 280, low: 100, high: 700 },
  { brand: "Seiko", re: /\bseiko\b/i, mid: 180, low: 40, high: 900 },
  { brand: "Citizen", re: /\bcitizen\b/i, mid: 90, low: 30, high: 350 },
  { brand: "Casio", re: /\bcasio\b|\bg[- ]?shock\b/i, mid: 70, low: 20, high: 250 },
  { brand: "Orient", re: /\borient\b/i, mid: 120, low: 40, high: 350 },
];

const PHONE_BRANDS: BrandBand[] = [
  { brand: "iPhone 16 Pro", re: /\biphone\s*16\s*pro\b/i, mid: 850, low: 650, high: 1100 },
  { brand: "iPhone 16", re: /\biphone\s*16\b/i, mid: 650, low: 480, high: 850 },
  { brand: "iPhone 15 Pro", re: /\biphone\s*15\s*pro\b/i, mid: 700, low: 520, high: 950 },
  { brand: "iPhone 15", re: /\biphone\s*15\b/i, mid: 480, low: 350, high: 650 },
  { brand: "iPhone 14 Pro", re: /\biphone\s*14\s*pro\b/i, mid: 480, low: 350, high: 650 },
  { brand: "iPhone 14", re: /\biphone\s*14\b/i, mid: 320, low: 220, high: 450 },
  { brand: "iPhone 13", re: /\biphone\s*13\b/i, mid: 230, low: 150, high: 350 },
  { brand: "Samsung S24", re: /\bgalaxy\s*s24\b|\bs24\s*ultra\b/i, mid: 450, low: 300, high: 700 },
  { brand: "Samsung S23", re: /\bgalaxy\s*s23\b|\bs23\s*ultra\b/i, mid: 300, low: 180, high: 480 },
  { brand: "Google Pixel", re: /\bpixel\s*(8|9)\b/i, mid: 280, low: 150, high: 500 },
];

const LAPTOP_BRANDS: BrandBand[] = [
  { brand: "MacBook Pro 16", re: /\bmacbook\s*pro\s*16\b/i, mid: 1400, low: 900, high: 2200 },
  { brand: "MacBook Pro 14", re: /\bmacbook\s*pro\s*14\b/i, mid: 1100, low: 700, high: 1800 },
  { brand: "MacBook Pro", re: /\bmacbook\s*pro\b/i, mid: 750, low: 350, high: 1500 },
  { brand: "MacBook Air", re: /\bmacbook\s*air\b/i, mid: 480, low: 220, high: 900 },
  { brand: "ThinkPad", re: /\bthinkpad\b/i, mid: 280, low: 100, high: 700 },
  { brand: "Dell XPS", re: /\bxps\s*1[35]\b|\bdell\s*xps\b/i, mid: 450, low: 200, high: 900 },
  { brand: "Surface Laptop", re: /\bsurface\s*(laptop|pro)\b/i, mid: 350, low: 150, high: 800 },
];

const TOOL_BRANDS: BrandBand[] = [
  { brand: "Milwaukee", re: /\bmilwaukee\b/i, mid: 180, low: 60, high: 450 },
  { brand: "Makita", re: /\bmakita\b/i, mid: 150, low: 50, high: 400 },
  { brand: "DeWalt", re: /\bdewalt\b|\bdewalt\b/i, mid: 160, low: 55, high: 420 },
  { brand: "Festool", re: /\bfestool\b/i, mid: 350, low: 120, high: 900 },
  { brand: "Bosch Professional", re: /\bbosch\s*(professional|blue)\b|\bgbh\b|\bgws\b/i, mid: 140, low: 45, high: 380 },
  { brand: "Hilti", re: /\bhilti\b/i, mid: 280, low: 90, high: 700 },
];

const CAMERA_BRANDS: BrandBand[] = [
  { brand: "Sony Alpha", re: /\bsony\s*(a7|a9|a6|alpha|ilce)\b|\ba7[ivr]?\b|\ba6700\b/i, mid: 900, low: 350, high: 2500 },
  { brand: "Canon EOS", re: /\bcanon\s*(eos|r[056]|5d|6d|90d|rp)\b|\beos\s*r\b/i, mid: 750, low: 250, high: 2200 },
  { brand: "Nikon Z", re: /\bnikon\s*(z[568]|z50|zfc|d850|d750)\b/i, mid: 800, low: 280, high: 2300 },
  { brand: "Fujifilm X", re: /\bfuji(film)?\s*(x[- ]?[tsh]|gfx)\b|\bx[- ]?t[345]\b|\bx100\b/i, mid: 700, low: 250, high: 1800 },
  { brand: "Panasonic Lumix", re: /\blumix\b|\bgh[567]\b|\bs[15]\b/i, mid: 550, low: 180, high: 1500 },
  { brand: "GoPro", re: /\bgopro\b|\bhero\s*\d+\b/i, mid: 180, low: 60, high: 350 },
];

const LENS_BRANDS: BrandBand[] = [
  { brand: "Canon L", re: /\bcanon\b.*\b(l\b|24-70|70-200|50mm\s*f1)/i, mid: 650, low: 200, high: 1800 },
  { brand: "Sony G Master", re: /\b(g\s*master|gm)\b|\bsony\b.*\b(24-70|70-200|85mm)\b/i, mid: 900, low: 300, high: 2200 },
  { brand: "Sigma Art", re: /\bsigma\s*(art|35|50|85|24-70)\b/i, mid: 450, low: 150, high: 1100 },
  { brand: "Tamron", re: /\btamron\b/i, mid: 350, low: 100, high: 900 },
  { brand: "Nikon Lens", re: /\bnikon\b.*\b(24-70|70-200|50mm|85mm|z\s*lens)\b/i, mid: 550, low: 180, high: 1600 },
];

const GPU_BRANDS: BrandBand[] = [
  { brand: "RTX 4090", re: /\brtx\s*4090\b/i, mid: 1400, low: 1000, high: 1800 },
  { brand: "RTX 4080", re: /\brtx\s*4080\b/i, mid: 850, low: 600, high: 1100 },
  { brand: "RTX 4070", re: /\brtx\s*4070\b/i, mid: 480, low: 320, high: 650 },
  { brand: "RTX 3080", re: /\brtx\s*3080\b/i, mid: 350, low: 220, high: 500 },
  { brand: "RTX 3070", re: /\brtx\s*3070\b/i, mid: 250, low: 160, high: 350 },
  { brand: "RTX 3060", re: /\brtx\s*3060\b/i, mid: 180, low: 110, high: 260 },
  { brand: "RX 7900", re: /\brx\s*7900\b/i, mid: 650, low: 420, high: 900 },
  { brand: "RX 7800 XT", re: /\brx\s*7800\b/i, mid: 420, low: 280, high: 550 },
  { brand: "RX 6800", re: /\brx\s*6800\b/i, mid: 300, low: 180, high: 420 },
];

const CONSOLE_BRANDS: BrandBand[] = [
  { brand: "PS5 Pro", re: /\bps5\s*pro\b|\bplaystation\s*5\s*pro\b/i, mid: 550, low: 420, high: 700 },
  { brand: "PS5", re: /\bps5\b|\bplaystation\s*5\b/i, mid: 320, low: 220, high: 450 },
  { brand: "Xbox Series X", re: /\bxbox\s*series\s*x\b/i, mid: 300, low: 200, high: 420 },
  { brand: "Switch OLED", re: /\bswitch\s*oled\b/i, mid: 200, low: 140, high: 280 },
  { brand: "Steam Deck", re: /\bsteam\s*deck\b/i, mid: 280, low: 180, high: 420 },
  { brand: "Nintendo Switch", re: /\bnintendo\s*switch\b|\bswitch\b(?!\s*oled)/i, mid: 140, low: 80, high: 220 },
];

const IPAD_BRANDS: BrandBand[] = [
  { brand: "iPad Pro", re: /\bipad\s*pro\b/i, mid: 550, low: 280, high: 1100 },
  { brand: "iPad Air", re: /\bipad\s*air\b/i, mid: 350, low: 180, high: 650 },
  { brand: "iPad Mini", re: /\bipad\s*mini\b/i, mid: 250, low: 120, high: 450 },
  { brand: "iPad", re: /\bipad\b/i, mid: 220, low: 100, high: 450 },
];

const APPLE_WATCH_BRANDS: BrandBand[] = [
  { brand: "Apple Watch Ultra", re: /\bapple\s*watch\s*ultra\b|\bultra\s*2\b/i, mid: 450, low: 300, high: 650 },
  { brand: "Apple Watch Series 10", re: /\bapple\s*watch\s*(series\s*)?10\b|\bwatch\s*s10\b/i, mid: 280, low: 180, high: 400 },
  { brand: "Apple Watch Series 9", re: /\bapple\s*watch\s*(series\s*)?9\b|\bwatch\s*s9\b/i, mid: 220, low: 140, high: 320 },
  { brand: "Apple Watch", re: /\bapple\s*watch\b/i, mid: 160, low: 70, high: 350 },
];

const DRONE_BRANDS: BrandBand[] = [
  { brand: "DJI Mini 4 Pro", re: /\bmini\s*4\s*pro\b/i, mid: 550, low: 380, high: 750 },
  { brand: "DJI Mini 3", re: /\bmini\s*3\b/i, mid: 280, low: 160, high: 420 },
  { brand: "DJI Air 3", re: /\bair\s*3\b/i, mid: 700, low: 450, high: 1000 },
  { brand: "DJI Mavic 3", re: /\bmavic\s*3\b/i, mid: 900, low: 500, high: 1400 },
  { brand: "DJI", re: /\bdji\b/i, mid: 250, low: 80, high: 800 },
];

const LEGO_BRANDS: BrandBand[] = [
  { brand: "LEGO UCS", re: /\b(ucs|ultimate collector)\b/i, mid: 350, low: 120, high: 900 },
  { brand: "LEGO Star Wars", re: /\bstar\s*wars\b/i, mid: 120, low: 30, high: 500 },
  { brand: "LEGO Modular", re: /\bmodular\b|\bcreator expert\b|\bicons\b/i, mid: 180, low: 60, high: 450 },
  { brand: "LEGO Technic", re: /\btechnic\b/i, mid: 140, low: 40, high: 400 },
  { brand: "LEGO", re: /\blego\b/i, mid: 80, low: 20, high: 300 },
];

const MUSIC_BRANDS: BrandBand[] = [
  { brand: "Moog", re: /\bmoog\b/i, mid: 600, low: 250, high: 1500 },
  { brand: "Roland", re: /\broland\b/i, mid: 280, low: 80, high: 900 },
  { brand: "Elektron", re: /\belektron\b/i, mid: 450, low: 180, high: 900 },
  { brand: "Strymon", re: /\bstrymon\b/i, mid: 220, low: 100, high: 400 },
  { brand: "Boss Pedal", re: /\bboss\b.*\b(pedal|od|delay|reverb|chorus)\b|\bbb[- ]?\d+\b/i, mid: 90, low: 30, high: 220 },
  { brand: "Focusrite", re: /\bfocusrite\b|\bscarlett\b/i, mid: 120, low: 40, high: 280 },
  { brand: "Native Instruments", re: /\bnative\s*instruments\b|\bmaschine\b|\bkomplete\s*kontrol\b/i, mid: 250, low: 80, high: 600 },
];

const SNEAKER_BRANDS: BrandBand[] = [
  { brand: "Jordan", re: /\bjordan\b|\baj[1-9]\b/i, mid: 180, low: 60, high: 600 },
  { brand: "Nike Dunk", re: /\bdunk\b/i, mid: 120, low: 50, high: 350 },
  { brand: "Yeezy", re: /\byeezy\b/i, mid: 160, low: 70, high: 450 },
  { brand: "New Balance", re: /\bnew\s*balance\b|\bnb\s*55[0-9]\b|\b990\b/i, mid: 110, low: 40, high: 280 },
  { brand: "Nike", re: /\bnike\b/i, mid: 90, low: 30, high: 300 },
  { brand: "Adidas", re: /\badidas\b/i, mid: 80, low: 25, high: 250 },
];

const BANDS: Record<FlipCategoryName, BrandBand[]> = {
  Watches: WATCH_BRANDS,
  Phones: PHONE_BRANDS,
  Laptops: LAPTOP_BRANDS,
  "Power Tools": TOOL_BRANDS,
  Cameras: CAMERA_BRANDS,
  "Camera Lenses": LENS_BRANDS,
  "Graphics Cards": GPU_BRANDS,
  "Gaming Consoles": CONSOLE_BRANDS,
  iPads: IPAD_BRANDS,
  "Apple Watches": APPLE_WATCH_BRANDS,
  Drones: DRONE_BRANDS,
  LEGO: LEGO_BRANDS,
  "Musical Gear": MUSIC_BRANDS,
  Sneakers: SNEAKER_BRANDS,
};

const FALLBACK_MID: Record<FlipCategoryName, number> = {
  Watches: 80,
  Phones: 120,
  Laptops: 200,
  "Power Tools": 100,
  Cameras: 250,
  "Camera Lenses": 200,
  "Graphics Cards": 180,
  "Gaming Consoles": 150,
  iPads: 180,
  "Apple Watches": 120,
  Drones: 150,
  LEGO: 60,
  "Musical Gear": 100,
  Sneakers: 70,
};

/** Brand / model queries per category for ending-soon auction sweeps. */
export const CATEGORY_SEARCH_QUERIES: Record<FlipCategoryName, string[]> = {
  Watches: ["Rolex", "Omega", "Cartier", "Breitling", "Tag Heuer", "Tudor", "Seiko", "Oris", "Longines", "Tissot"],
  Phones: ["iPhone 15", "iPhone 14", "iPhone 13", "Samsung Galaxy S24", "Samsung Galaxy S23", "Google Pixel"],
  Laptops: ["MacBook Pro", "MacBook Air", "ThinkPad", "Dell XPS", "Surface Laptop"],
  "Power Tools": ["Milwaukee", "Makita", "DeWalt", "Festool", "Bosch Professional", "Hilti"],
  Cameras: ["Sony A7", "Canon EOS R", "Nikon Z", "Fujifilm X-T", "Panasonic Lumix", "GoPro Hero"],
  "Camera Lenses": ["Canon L lens", "Sony GM", "Sigma Art", "Tamron", "Nikon Z lens"],
  "Graphics Cards": ["RTX 4090", "RTX 4080", "RTX 4070", "RTX 3080", "RTX 3070", "RX 7800"],
  "Gaming Consoles": ["PS5", "Xbox Series X", "Switch OLED", "Steam Deck", "Nintendo Switch"],
  iPads: ["iPad Pro", "iPad Air", "iPad Mini", "iPad 10"],
  "Apple Watches": ["Apple Watch Ultra", "Apple Watch Series 10", "Apple Watch Series 9", "Apple Watch SE"],
  Drones: ["DJI Mini 4 Pro", "DJI Mini 3", "DJI Air 3", "DJI Mavic 3"],
  LEGO: ["LEGO Star Wars UCS", "LEGO Modular", "LEGO Technic", "LEGO Icons"],
  "Musical Gear": ["Moog", "Roland synth", "Strymon", "Focusrite Scarlett", "Elektron"],
  Sneakers: ["Jordan 1", "Nike Dunk", "Yeezy", "New Balance 550", "Air Max"],
};

export function matchBrand(title: string, category: FlipCategoryName): BrandBand | null {
  if (category === "Watches") {
    if (/\btudor\b/i.test(title)) return WATCH_BRANDS.find((b) => b.brand === "Tudor") ?? null;
    if (/\btissot\b/i.test(title)) return WATCH_BRANDS.find((b) => b.brand === "Tissot") ?? null;
  }
  for (const b of BANDS[category]) {
    if (b.re.test(title)) return b;
  }
  return null;
}

export function heuristicMarketValue(
  title: string,
  category: FlipCategoryName,
  currentPrice: number,
): { brand: string | null; marketValue: number; confidence: number } {
  const band = matchBrand(title, category);
  if (!band) {
    const fallback = FALLBACK_MID[category];
    const marketValue = Math.max(currentPrice * 1.15, fallback * 0.6);
    return { brand: null, marketValue: Math.round(marketValue), confidence: 25 };
  }

  let marketValue = band.mid;
  if (currentPrice > band.mid) {
    marketValue = Math.min(band.high, Math.max(band.mid, currentPrice * 1.08));
  }

  const span = band.high - band.low || 1;
  const proximity = 1 - Math.min(1, Math.abs(marketValue - band.mid) / span);
  const confidence = Math.round(45 + proximity * 25);

  return { brand: band.brand, marketValue: Math.round(marketValue), confidence };
}

export function compsQuery(title: string, brand: string | null): string {
  const cleaned = title
    .replace(/[^\w\s+-]/g, " ")
    .replace(/\b(genuine|authentic|rare|boxed|warranty|uk|seller|fast|postage|new|used|excellent)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (brand) {
    const after = cleaned.replace(new RegExp(brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), "").trim();
    const tokens = after.split(" ").filter((t) => t.length > 1).slice(0, 4);
    return [brand, ...tokens].join(" ").slice(0, 80);
  }
  return cleaned.split(" ").slice(0, 6).join(" ");
}
