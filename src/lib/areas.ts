import { formatGBP, getBusinessType, type BusinessType } from "@/lib/opportunity";

// ---------------------------------------------------------------------------
// Opportunity Areas
//
// Turns PUBLIC indicators into a per-area revenue-opportunity model. The key
// product insight: no public table says "postcode -> implant patients ->
// revenue". Instead we model the *likelihood* of demand from publicly available
// signals (income, property values, age profile, home-ownership, NHS dental
// access, local competition, search interest) and translate that into an
// indicative revenue range — the same way commercial intelligence products work.
//
// v1 status: the area inputs below are reference proxies derived from public
// benchmarks (ONS, Land Registry, NHS dental access reporting). They are good
// enough to demonstrate the ranking and the math, and are designed to be
// replaced field-by-field with live dataset ingestion (Land Registry HPI, ONS
// income/age, NHS access) without changing the scoring/revenue code.
//
// On top of the static proxies we add a LIVE layer: planning / new-housing
// signals already ingested by the pipeline boost the catchment of any area they
// mention, so the model reacts to real development activity.
// ---------------------------------------------------------------------------

export interface AreaProfile {
  /** postcode district, e.g. "M20" */
  code: string;
  name: string;
  region: string;
  /** approx adult population in the district (ONS-scale proxy) */
  adultPopulation: number;
  /** wealth proxy, 0..1 relative to UK */
  incomeIndex: number;
  /** median house price (£), Land Registry-scale proxy */
  medianHousePrice: number;
  /** share of population aged 40+ (implant-skewing), 0..1 */
  age40plusShare: number;
  /** share aged 25-45 (clear-aligner-skewing), 0..1 */
  age25to45Share: number;
  /** owner-occupier share, 0..1 */
  homeownership: number;
  /** NHS dental access: 1 = good access, 0 = poor (poor => more private demand) */
  nhsAccessIndex: number;
  /** local dentist density, 0..1 (higher = more competition) */
  competition: number;
  /** relative local search interest for private dentistry, 0..1 */
  searchDemand: number;
  /** population growth momentum, 0..1 */
  populationGrowth: number;
}

// Reference seed. Values are approximate public-benchmark proxies for v1.
export const AREA_PROFILES: AreaProfile[] = [
  { code: "M20", name: "Didsbury", region: "Greater Manchester", adultPopulation: 28000, incomeIndex: 0.82, medianHousePrice: 450000, age40plusShare: 0.42, age25to45Share: 0.40, homeownership: 0.55, nhsAccessIndex: 0.30, competition: 0.55, searchDemand: 0.75, populationGrowth: 0.70 },
  { code: "M21", name: "Chorlton", region: "Greater Manchester", adultPopulation: 24000, incomeIndex: 0.74, medianHousePrice: 400000, age40plusShare: 0.40, age25to45Share: 0.42, homeownership: 0.52, nhsAccessIndex: 0.32, competition: 0.50, searchDemand: 0.70, populationGrowth: 0.68 },
  { code: "M33", name: "Sale", region: "Trafford", adultPopulation: 23000, incomeIndex: 0.72, medianHousePrice: 360000, age40plusShare: 0.46, age25to45Share: 0.38, homeownership: 0.68, nhsAccessIndex: 0.35, competition: 0.45, searchDemand: 0.60, populationGrowth: 0.64 },
  { code: "SE6", name: "Catford", region: "London", adultPopulation: 30000, incomeIndex: 0.55, medianHousePrice: 475000, age40plusShare: 0.38, age25to45Share: 0.44, homeownership: 0.45, nhsAccessIndex: 0.35, competition: 0.48, searchDemand: 0.60, populationGrowth: 0.75 },
  { code: "SE3", name: "Blackheath", region: "London", adultPopulation: 22000, incomeIndex: 0.85, medianHousePrice: 650000, age40plusShare: 0.47, age25to45Share: 0.40, homeownership: 0.58, nhsAccessIndex: 0.40, competition: 0.55, searchDemand: 0.68, populationGrowth: 0.58 },
  { code: "SW19", name: "Wimbledon", region: "London", adultPopulation: 26000, incomeIndex: 0.88, medianHousePrice: 750000, age40plusShare: 0.45, age25to45Share: 0.38, homeownership: 0.60, nhsAccessIndex: 0.40, competition: 0.60, searchDemand: 0.72, populationGrowth: 0.55 },
  { code: "TW9", name: "Richmond", region: "London", adultPopulation: 23000, incomeIndex: 0.90, medianHousePrice: 800000, age40plusShare: 0.48, age25to45Share: 0.38, homeownership: 0.62, nhsAccessIndex: 0.45, competition: 0.60, searchDemand: 0.70, populationGrowth: 0.54 },
  { code: "N1", name: "Islington", region: "London", adultPopulation: 27000, incomeIndex: 0.80, medianHousePrice: 700000, age40plusShare: 0.35, age25to45Share: 0.50, homeownership: 0.42, nhsAccessIndex: 0.38, competition: 0.70, searchDemand: 0.80, populationGrowth: 0.58 },
  { code: "E14", name: "Canary Wharf", region: "London", adultPopulation: 32000, incomeIndex: 0.72, medianHousePrice: 520000, age40plusShare: 0.30, age25to45Share: 0.55, homeownership: 0.40, nhsAccessIndex: 0.42, competition: 0.55, searchDemand: 0.78, populationGrowth: 0.85 },
  { code: "LS6", name: "Headingley", region: "Leeds", adultPopulation: 22000, incomeIndex: 0.58, medianHousePrice: 300000, age40plusShare: 0.30, age25to45Share: 0.48, homeownership: 0.40, nhsAccessIndex: 0.45, competition: 0.45, searchDemand: 0.55, populationGrowth: 0.62 },
  { code: "B15", name: "Edgbaston", region: "Birmingham", adultPopulation: 20000, incomeIndex: 0.70, medianHousePrice: 350000, age40plusShare: 0.42, age25to45Share: 0.40, homeownership: 0.55, nhsAccessIndex: 0.40, competition: 0.50, searchDemand: 0.58, populationGrowth: 0.60 },
  { code: "EH10", name: "Morningside", region: "Edinburgh", adultPopulation: 21000, incomeIndex: 0.80, medianHousePrice: 400000, age40plusShare: 0.48, age25to45Share: 0.38, homeownership: 0.62, nhsAccessIndex: 0.50, competition: 0.52, searchDemand: 0.60, populationGrowth: 0.55 },
  { code: "BS9", name: "Stoke Bishop", region: "Bristol", adultPopulation: 19000, incomeIndex: 0.82, medianHousePrice: 500000, age40plusShare: 0.50, age25to45Share: 0.35, homeownership: 0.70, nhsAccessIndex: 0.45, competition: 0.48, searchDemand: 0.58, populationGrowth: 0.52 },
  { code: "CF11", name: "Pontcanna", region: "Cardiff", adultPopulation: 20000, incomeIndex: 0.68, medianHousePrice: 320000, age40plusShare: 0.38, age25to45Share: 0.46, homeownership: 0.52, nhsAccessIndex: 0.48, competition: 0.46, searchDemand: 0.55, populationGrowth: 0.60 },
];

// --- dental treatment economics (public-benchmark ranges) ------------------
// propensity = share of adults seeking the treatment per year
// capture    = share of that demand a single proactive practice can win
// value      = £ per case (implant/Invisalign) or £/yr (private patient)
const DENTAL = {
  implant: { propensity: [0.004, 0.010] as const, capture: [0.05, 0.12] as const, value: [2500, 6000] as const },
  invisalign: { propensity: [0.006, 0.015] as const, capture: [0.05, 0.12] as const, value: [2500, 4000] as const },
  private: { propensity: [0.004, 0.010] as const, capture: [0.20, 0.45] as const, value: [400, 1500] as const },
} as const;

const RESIDENTS_PER_HOME = 2.35;

export interface RevenueLine {
  label: string;
  patientsLow: number;
  patientsHigh: number;
  valueLow: number;
  valueHigh: number;
  revenueLow: number;
  revenueHigh: number;
}

export interface AreaScore {
  area: AreaProfile;
  /** 0-100 headline opportunity score */
  overallScore: number;
  /** dental sub-scores + revenue lines, present only for the dentist playbook */
  dental?: {
    implantScore: number;
    invisalignScore: number;
    privateScore: number;
    lines: RevenueLine[];
  };
  /** indicative 12-month revenue potential */
  revenueLow: number;
  revenueHigh: number;
  revenueLabel: string;
  /** new homes matched to this area from live planning signals */
  newHomes: number;
  action: string;
  assumptions: string[];
}

// --- helpers ---------------------------------------------------------------

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** normalise a value into 0..1 across [lo, hi] */
function norm(v: number, lo: number, hi: number): number {
  return clamp((v - lo) / (hi - lo), 0, 1);
}

export function implantScore(a: AreaProfile): number {
  const raw =
    a.incomeIndex * 0.3 +
    a.age40plusShare * 0.25 +
    norm(a.medianHousePrice, 150_000, 800_000) * 0.2 +
    a.homeownership * 0.15 +
    (1 - a.competition) * 0.1;
  return Math.round(clamp(raw, 0, 1) * 100);
}

export function invisalignScore(a: AreaProfile): number {
  const raw =
    a.age25to45Share * 0.35 +
    a.incomeIndex * 0.3 +
    a.searchDemand * 0.2 +
    (1 - a.competition) * 0.15;
  return Math.round(clamp(raw, 0, 1) * 100);
}

export function privateScore(a: AreaProfile): number {
  const raw =
    (1 - a.nhsAccessIndex) * 0.4 +
    a.incomeIndex * 0.3 +
    a.populationGrowth * 0.2 +
    (1 - a.competition) * 0.1;
  return Math.round(clamp(raw, 0, 1) * 100);
}

function genericScore(a: AreaProfile): number {
  const raw = a.incomeIndex * 0.4 + a.populationGrowth * 0.3 + (1 - a.competition) * 0.3;
  return Math.round(clamp(raw, 0, 1) * 100);
}

function dentalLine(
  label: string,
  adults: number,
  score: number,
  econ: { propensity: readonly [number, number]; capture: readonly [number, number]; value: readonly [number, number] },
): RevenueLine {
  const f = clamp(score / 100, 0, 1);
  const patientsLow = adults * econ.propensity[0] * econ.capture[0] * f;
  const patientsHigh = adults * econ.propensity[1] * econ.capture[1] * f;
  return {
    label,
    patientsLow,
    patientsHigh,
    valueLow: econ.value[0],
    valueHigh: econ.value[1],
    revenueLow: patientsLow * econ.value[0],
    revenueHigh: patientsHigh * econ.value[1],
  };
}

/**
 * Score a single area for a business type. `newHomes` is the live planning /
 * new-housing count matched to the area, which expands the catchment.
 */
export function scoreArea(a: AreaProfile, bt: BusinessType, newHomes = 0): AreaScore {
  const addedAdults = newHomes * RESIDENTS_PER_HOME;
  const adults = a.adultPopulation + addedAdults;

  if (bt.key === "dentist") {
    const iScore = implantScore(a);
    const vScore = invisalignScore(a);
    const pScore = privateScore(a);
    const lines = [
      dentalLine("Implant cases", adults, iScore, DENTAL.implant),
      dentalLine("Invisalign cases", adults, vScore, DENTAL.invisalign),
      dentalLine("New private patients", adults, pScore, DENTAL.private),
    ];
    const revenueLow = lines.reduce((s, l) => s + l.revenueLow, 0);
    const revenueHigh = lines.reduce((s, l) => s + l.revenueHigh, 0);
    const overallScore = Math.round((iScore + vScore + pScore) / 3);
    const patLow = Math.round(lines.reduce((s, l) => s + l.patientsLow, 0));
    const patHigh = Math.round(lines.reduce((s, l) => s + l.patientsHigh, 0));

    const assumptions = [
      `${a.name} (${a.code}) catchment ≈ ${Math.round(adults).toLocaleString()} adults${newHomes ? ` (incl. ${newHomes} new homes from live planning data)` : ""}.`,
      `Implant ${iScore}/100 · Invisalign ${vScore}/100 · Private ${pScore}/100 — modelled from income, age profile, property values, NHS access and local competition.`,
      `Implants £${DENTAL.implant.value[0].toLocaleString()}–£${DENTAL.implant.value[1].toLocaleString()}/case, Invisalign £${DENTAL.invisalign.value[0].toLocaleString()}–£${DENTAL.invisalign.value[1].toLocaleString()}/case, private patient £${DENTAL.private.value[0]}–£${DENTAL.private.value[1].toLocaleString()}/yr (public UK benchmarks).`,
      `Conservative practice capture of local demand applied; figures are indicative demand likelihood, not patient records.`,
    ];

    return {
      area: a,
      overallScore,
      dental: { implantScore: iScore, invisalignScore: vScore, privateScore: pScore, lines },
      revenueLow,
      revenueHigh,
      revenueLabel: revLabel(revenueLow, revenueHigh),
      newHomes,
      action: `Target ${a.name} (${a.code}) with implant + Invisalign campaigns — ~${patLow}–${patHigh} new high-value cases over 12 months.`,
      assumptions,
    };
  }

  // Generic playbook for non-dental business types: new movers + new-build
  // residents converted at the business type's capture rate.
  const score = genericScore(a);
  const f = clamp(score / 100, 0, 1);
  const movers = a.adultPopulation * 0.02 + addedAdults; // ~2% annual churn + new homes
  const custLow = movers * bt.captureRate[0] * f;
  const custHigh = movers * bt.captureRate[1] * f;
  const revenueLow = custLow * bt.customerAnnualValue[0];
  const revenueHigh = custHigh * bt.customerAnnualValue[1];
  const basisSuffix = bt.valueBasis === "per year" ? "/yr" : "";

  return {
    area: a,
    overallScore: score,
    revenueLow,
    revenueHigh,
    revenueLabel: revLabel(revenueLow, revenueHigh),
    newHomes,
    action: `Focus outreach on ${a.name} (${a.code}) — ~${Math.round(custLow)}–${Math.round(custHigh)} new ${bt.customerNoun}s${basisSuffix ? " per year" : ""}.`,
    assumptions: [
      `${a.name} (${a.code}) ≈ ${a.adultPopulation.toLocaleString()} adults${newHomes ? ` + ${newHomes} new homes (live planning data)` : ""}.`,
      `Opportunity ${score}/100 from income, population growth and local competition.`,
      `${Math.round(bt.captureRate[0] * 100)}–${Math.round(bt.captureRate[1] * 100)}% capture of movers/new residents at £${bt.customerAnnualValue[0].toLocaleString()}–£${bt.customerAnnualValue[1].toLocaleString()} per ${bt.customerNoun}${basisSuffix}.`,
    ],
  };
}

function revLabel(low: number, high: number): string {
  return `${formatGBP(low)}–${formatGBP(high)}`;
}

/**
 * Rank all areas for a business type, highest revenue potential first.
 * `homesByArea` maps a postcode-district code to live new-home counts.
 */
export function rankAreas(
  businessTypeKey: string,
  homesByArea: Record<string, number> = {},
  opts: { region?: string } = {},
): AreaScore[] {
  const bt = getBusinessType(businessTypeKey);
  let areas = AREA_PROFILES;
  if (opts.region) areas = areas.filter((a) => a.region === opts.region);
  return areas
    .map((a) => scoreArea(a, bt, homesByArea[a.code] ?? 0))
    .sort((x, y) => y.revenueHigh - x.revenueHigh);
}

/** Sum new homes mentioned in signal text, attributed to areas they name. */
export function homesByArea(signalTexts: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  const homeRe = /\b(\d{1,5})\s*(?:no\.?\s*)?(?:new\s+|additional\s+)?(?:dwellings?|homes?|flats?|apartments?|residential\s+units?)\b/gi;
  for (const area of AREA_PROFILES) {
    const codeRe = new RegExp(`\\b${area.code}\\b`, "i");
    const nameRe = new RegExp(`\\b${area.name}\\b`, "i");
    let homes = 0;
    for (const raw of signalTexts) {
      const text = raw || "";
      if (!codeRe.test(text) && !nameRe.test(text)) continue;
      homeRe.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = homeRe.exec(text)) !== null) {
        const n = parseInt(m[1], 10);
        if (Number.isFinite(n)) homes += n;
      }
    }
    if (homes > 0) out[area.code] = homes;
  }
  return out;
}

export function uniqueRegions(): string[] {
  return Array.from(new Set(AREA_PROFILES.map((a) => a.region))).sort();
}
