/**
 * Algorithmic job intelligence for Pickup Radar.
 * Estimates fuel, likely bid range, and profit — Shiply does not expose
 * actual quote amounts, so all figures are labelled as estimates.
 */

export type JobIntelInput = {
  miles: number | null;
  quotes: number | null;
  service: string;
};

export type JobIntelligence = {
  miles: number;
  /** Litres of diesel for the run (one-way). */
  fuelLitres: number;
  fuelCost: number;
  bidLow: number;
  bidHigh: number;
  /** Mid-range bid adjusted for competition — a realistic target to win. */
  suggestedBid: number;
  profitLow: number;
  profitHigh: number;
  /** Profit if you win at the suggested bid. */
  profitAtBid: number;
  profitPerMile: number;
  marginPct: number;
  ratePerMile: number;
  drivingHours: number;
  competition: "low" | "medium" | "high" | "unknown";
  competitionLabel: string;
  verdict: "strong" | "good" | "marginal" | "thin";
  verdictLabel: string;
  verdictHint: string;
};

// UK LWB diesel van, partly loaded — conservative for profit estimates.
const VAN_MPG = 28;
const LITRES_PER_UK_GALLON = 4.54609;
const DEFAULT_FUEL_PPL = 1.45; // £/litre diesel
const LOADING_OVERHEAD = 15; // £ time for load/unload (fixed estimate)
const AVG_SPEED_MPH = 42;

/** Per-category multiplier on the base £/mile curve. */
const SERVICE_MULTIPLIER: Record<string, number> = {
  Pianos: 1.55,
  Cars: 1.4,
  Motorcycles: 1.25,
  "Other Vehicles": 1.3,
  Boats: 1.6,
  Haulage: 1.7,
  "Moving Home": 1.45,
  "Pets & Livestock": 1.35,
  "Vehicle Parts": 1.15,
  Boxes: 1.05,
  Other: 1.1,
};

function fuelPricePerLitre(): number {
  const raw = process.env.NEXT_PUBLIC_FUEL_PPL;
  if (raw) {
    const n = Number.parseFloat(raw);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return DEFAULT_FUEL_PPL;
}

function serviceMultiplier(service: string): number {
  if (SERVICE_MULTIPLIER[service]) return SERVICE_MULTIPLIER[service]!;
  const s = service.toLowerCase();
  if (s.includes("piano")) return 1.55;
  if (s.includes("car") || s.includes("vehicle")) return 1.35;
  if (s.includes("haul")) return 1.7;
  if (s.includes("removal") || s.includes("moving")) return 1.45;
  return 1;
}

function bidRange(miles: number, service: string): { low: number; high: number } {
  const mult = serviceMultiplier(service);
  const base = 35;
  const perMile = 0.55;
  const low = Math.round((base + miles * perMile * 0.85) * mult);
  const high = Math.round((base + miles * perMile * 1.35) * mult);
  return { low: Math.max(low, 25), high: Math.max(high, low + 15) };
}

function fuelFromMiles(miles: number): { litres: number; cost: number } {
  const gallons = miles / VAN_MPG;
  const litres = gallons * LITRES_PER_UK_GALLON;
  const cost = litres * fuelPricePerLitre();
  return { litres, cost };
}

function competitionLevel(quotes: number | null): JobIntelligence["competition"] {
  if (quotes == null) return "unknown";
  if (quotes <= 2) return "low";
  if (quotes <= 6) return "medium";
  return "high";
}

function competitionLabel(level: JobIntelligence["competition"], quotes: number | null): string {
  if (level === "unknown") return "Competition unknown";
  if (level === "low") return `${quotes} quotes · low competition`;
  if (level === "medium") return `${quotes} quotes · moderate competition`;
  return `${quotes} quotes · crowded — bid sharp`;
}

function verdict(
  profitPerMile: number,
  marginPct: number,
): Pick<JobIntelligence, "verdict" | "verdictLabel" | "verdictHint"> {
  if (profitPerMile >= 1.2 && marginPct >= 45) {
    return {
      verdict: "strong",
      verdictLabel: "Strong opportunity",
      verdictHint: "Healthy margin after fuel — worth quoting",
    };
  }
  if (profitPerMile >= 0.65 && marginPct >= 30) {
    return {
      verdict: "good",
      verdictLabel: "Good margin",
      verdictHint: "Solid run if you win near the guide price",
    };
  }
  if (profitPerMile >= 0.35 && marginPct >= 18) {
    return {
      verdict: "marginal",
      verdictLabel: "Marginal",
      verdictHint: "Thin after fuel — only if you're passing that way",
    };
  }
  return {
    verdict: "thin",
    verdictLabel: "Thin margins",
    verdictHint: "Low £/mile after fuel — consider skipping unless back-load",
  };
}

export function analyzeJob(input: JobIntelInput): JobIntelligence | null {
  const miles = input.miles;
  if (miles == null || miles < 1) return null;

  const { litres, cost: fuelCost } = fuelFromMiles(miles);
  const { low: bidLow, high: bidHigh } = bidRange(miles, input.service);
  const mid = (bidLow + bidHigh) / 2;

  const quotes = input.quotes ?? 0;
  const quoteDiscount = Math.min(quotes * 0.04, 0.22);
  const suggestedBid = Math.round(mid * (1 - quoteDiscount));

  const profitLow = Math.round(bidLow - fuelCost - LOADING_OVERHEAD);
  const profitHigh = Math.round(bidHigh - fuelCost - LOADING_OVERHEAD);
  const profitAtBid = Math.round(suggestedBid - fuelCost - LOADING_OVERHEAD);
  const profitPerMile = Math.round((profitAtBid / miles) * 100) / 100;
  const marginPct = suggestedBid > 0 ? Math.round((profitAtBid / suggestedBid) * 100) : 0;
  const ratePerMile = Math.round((suggestedBid / miles) * 100) / 100;
  const drivingHours = Math.round((miles / AVG_SPEED_MPH + 0.75) * 10) / 10;

  const comp = competitionLevel(input.quotes);
  const v = verdict(profitPerMile, marginPct);

  return {
    miles,
    fuelLitres: Math.round(litres * 10) / 10,
    fuelCost: Math.round(fuelCost),
    bidLow,
    bidHigh,
    suggestedBid,
    profitLow,
    profitHigh,
    profitAtBid,
    profitPerMile,
    marginPct,
    ratePerMile,
    drivingHours,
    competition: comp,
    competitionLabel: competitionLabel(comp, input.quotes),
    ...v,
  };
}

export function formatGbp(amount: number): string {
  return `£${amount.toLocaleString("en-GB")}`;
}
