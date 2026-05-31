import type { SignalDTO } from "@/lib/types";

// ---------------------------------------------------------------------------
// Opportunity Engine (Phase 1)
// Translates a raw Signal into a business-specific Opportunity: a revenue
// estimate (with transparent assumptions), a recommended action, and a 0-100
// opportunity score. Deterministic + config-driven so it runs with no AI and
// no per-call cost. A future LLM translator can replace `translate()` while
// keeping the same output shape.
// ---------------------------------------------------------------------------

export type GrowthGoal = "leads" | "revenue" | "locations" | "hiring" | "partnerships";

export interface BusinessType {
  key: string;
  label: string;
  /** what a won customer is called, e.g. "patient", "client" */
  customerNoun: string;
  /** keywords used to match relevant signals */
  keywords: string[];
  /** average residents per new home (catchment math) */
  residentsPerHome: number;
  /** [low, high] share of new local residents that become customers */
  captureRate: [number, number];
  /** [low, high] annual value of a customer (or fee per placement/transaction) */
  customerAnnualValue: [number, number];
  /** [low, high] share of arriving workers captured (employer signals) */
  workerCaptureRate: [number, number];
  /** whether customerAnnualValue is recurring per year vs a one-off fee */
  valueBasis: "per year" | "one-off";
}

export const BUSINESS_TYPES: BusinessType[] = [
  {
    key: "dentist",
    label: "Dental practice",
    customerNoun: "patient",
    keywords: ["dental", "dentist", "implant", "invisalign", "orthodont", "veneer", "teeth", "tooth", "oral", "whitening", "hygiene"],
    residentsPerHome: 2.3,
    captureRate: [0.03, 0.08],
    customerAnnualValue: [180, 650],
    workerCaptureRate: [0.02, 0.05],
    valueBasis: "per year",
  },
  {
    key: "accountant",
    label: "Accountancy firm",
    customerNoun: "client",
    keywords: ["account", "bookkeep", "tax", "payroll", "audit", "incorporat", "startup", "sme", "self assessment", "finance"],
    residentsPerHome: 2.3,
    captureRate: [0.005, 0.02],
    customerAnnualValue: [600, 2500],
    workerCaptureRate: [0.005, 0.02],
    valueBasis: "per year",
  },
  {
    key: "estate_agent",
    label: "Estate agency",
    customerNoun: "instruction",
    keywords: ["property", "homes", "housing", "development", "residential", "letting", "rent", "landlord", "house price", "regeneration"],
    residentsPerHome: 2.3,
    captureRate: [0.02, 0.06],
    customerAnnualValue: [1500, 6000],
    workerCaptureRate: [0.01, 0.03],
    valueBasis: "one-off",
  },
  {
    key: "recruiter",
    label: "Recruitment agency",
    customerNoun: "placement",
    keywords: ["hiring", "recruit", "talent", "job", "headcount", "vacanc", "staffing", "appointed", "expansion", "roles"],
    residentsPerHome: 2.3,
    captureRate: [0.01, 0.04],
    customerAnnualValue: [8000, 30000],
    workerCaptureRate: [0.05, 0.15],
    valueBasis: "one-off",
  },
  {
    key: "marketing_agency",
    label: "Marketing agency",
    customerNoun: "client",
    keywords: ["marketing", "brand", "advertis", "seo", "ppc", "social media", "growth", "campaign", "funding", "launch", "expansion"],
    residentsPerHome: 2.3,
    captureRate: [0.005, 0.02],
    customerAnnualValue: [6000, 36000],
    workerCaptureRate: [0.01, 0.04],
    valueBasis: "per year",
  },
  {
    key: "saas",
    label: "Software / SaaS company",
    customerNoun: "account",
    keywords: ["software", "saas", "platform", "api", "ai", "cloud", "digital", "tech", "app", "adoption", "migration"],
    residentsPerHome: 2.3,
    captureRate: [0.005, 0.02],
    customerAnnualValue: [3000, 24000],
    workerCaptureRate: [0.01, 0.04],
    valueBasis: "per year",
  },
  {
    key: "generic",
    label: "Other / general",
    customerNoun: "customer",
    keywords: [],
    residentsPerHome: 2.3,
    captureRate: [0.01, 0.04],
    customerAnnualValue: [500, 5000],
    workerCaptureRate: [0.01, 0.04],
    valueBasis: "per year",
  },
];

const BY_KEY = new Map(BUSINESS_TYPES.map((b) => [b.key, b]));

export function getBusinessType(key?: string | null): BusinessType {
  return (key && BY_KEY.get(key)) || BY_KEY.get("generic")!;
}

export type Archetype = "new_resident" | "employer" | "competitor" | "demand";

export interface OpportunityResult {
  archetype: Archetype;
  label: string;
  revenueLow: number;
  revenueHigh: number;
  revenueLabel: string;
  basis: "per year" | "one-off" | "at risk";
  area: string | null;
  /** 0-100 */
  score: number;
  action: string;
  assumptions: string[];
  defensive: boolean;
}

export interface TranslateContext {
  location: string;
  growthGoal?: GrowthGoal;
  locationMatch: boolean;
  industryMatch: boolean;
}

// --- helpers ---------------------------------------------------------------

export function formatGBP(n: number): string {
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}m`;
  if (n >= 1_000) return `£${Math.round(n / 1_000)}k`;
  return `£${Math.round(n)}`;
}

function rangeLabel(low: number, high: number, basis: string): string {
  const suffix = basis === "per year" ? " / yr" : basis === "at risk" ? " at risk" : "";
  if (Math.round(low) === Math.round(high)) return `${formatGBP(high)}${suffix}`;
  return `${formatGBP(low)}–${formatGBP(high)}${suffix}`;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Pull the first quantity that appears near any of the given nouns. */
function extractQuantity(text: string, nouns: string[]): number | null {
  const t = text.toLowerCase();
  const alt = nouns.join("|");
  // "850 new homes", "2,500 office workers"
  const before = new RegExp(`([0-9][0-9,\\.]{1,})\\s+(?:[a-z]+\\s+){0,3}(?:${alt})`, "i");
  // "homes: 850", "workforce of 2,500"
  const after = new RegExp(`(?:${alt})[^0-9]{0,12}([0-9][0-9,\\.]{1,})`, "i");
  const m = t.match(before) || t.match(after);
  if (!m) return null;
  const n = parseInt(m[1].replace(/[,\.]/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function band(extracted: number | null, fallback: [number, number]): [number, number] {
  if (extracted != null) return [extracted, extracted];
  return fallback;
}

function fullText(s: SignalDTO): string {
  return [s.title, s.summary, s.whatChanged ?? "", ...s.whyItMatters, ...s.opportunities.map((o) => o.title)].join(" • ");
}

function classify(s: SignalDTO): Archetype {
  const g = s.groupName.toLowerCase();
  const type = s.type.toLowerCase();
  if (type === "development" || type === "contractor_appointment" || g.includes("property") || g.includes("construction")) {
    return "new_resident";
  }
  if (["hiring", "exec_hiring", "remote_hiring", "visa_hiring", "expansion"].includes(type)) return "employer";
  if (["competitor_move", "product_launch", "partnership", "acquisition"].includes(type)) return "competitor";
  return "demand";
}

function scoreOf(confidence: number, ctx: TranslateContext, revenueHigh: number): number {
  const match = (ctx.locationMatch ? 0.5 : 0) + (ctx.industryMatch ? 0.5 : 0);
  const value = clamp(Math.log10(revenueHigh + 1) / 6, 0, 1); // ~£1m -> 1.0
  const raw = confidence * 45 + match * 25 + value * 30;
  return Math.round(clamp(raw, 5, 99));
}

function goalSuffix(goal?: GrowthGoal): string {
  switch (goal) {
    case "leads": return " Prioritise lead capture (landing page + local ads).";
    case "revenue": return " Lead with your highest-margin service.";
    case "locations": return " Use this to validate catchment for a new site.";
    case "hiring": return " Pair outreach with capacity to take on the new demand.";
    case "partnerships": return " Approach via a local referral partnership.";
    default: return "";
  }
}

// --- the translator --------------------------------------------------------

export function translate(s: SignalDTO, bt: BusinessType, ctx: TranslateContext): OpportunityResult {
  const archetype = classify(s);
  const area = s.entityLocation || (ctx.location ? ctx.location : null);
  const text = fullText(s);

  if (archetype === "new_resident") {
    const homes = extractQuantity(text, ["homes", "home", "dwellings", "dwelling", "residential units", "flats", "houses"]);
    const [hLow, hHigh] = band(homes, [40, 120]);
    const resLow = hLow * bt.residentsPerHome;
    const resHigh = hHigh * bt.residentsPerHome;
    const custLow = resLow * bt.captureRate[0];
    const custHigh = resHigh * bt.captureRate[1];
    const revLow = custLow * bt.customerAnnualValue[0];
    const revHigh = custHigh * bt.customerAnnualValue[1];
    const assumptions = [
      `${homes ? homes.toLocaleString() : `~${hLow}–${hHigh}`} new homes${homes ? "" : " (size not stated — typical range assumed)"}`,
      `${bt.residentsPerHome} residents per home → ${Math.round(resLow).toLocaleString()}–${Math.round(resHigh).toLocaleString()} new residents`,
      `${pct(bt.captureRate)} become ${bt.customerNoun}s → ${Math.round(custLow)}–${Math.round(custHigh)} new ${bt.customerNoun}s`,
      `${formatGBP(bt.customerAnnualValue[0])}–${formatGBP(bt.customerAnnualValue[1])} value per ${bt.customerNoun} (${bt.valueBasis})`,
    ];
    return {
      archetype,
      label: "New resident opportunity",
      revenueLow: revLow,
      revenueHigh: revHigh,
      revenueLabel: rangeLabel(revLow, revHigh, bt.valueBasis),
      basis: bt.valueBasis,
      area,
      score: scoreOf(s.confidence, ctx, revHigh),
      action: `Launch a new-resident campaign in ${area ?? "the catchment"} ahead of occupancy.${goalSuffix(ctx.growthGoal)}`,
      assumptions,
      defensive: false,
    };
  }

  if (archetype === "employer") {
    const workers = extractQuantity(text, ["workers", "worker", "employees", "employee", "jobs", "hires", "staff", "roles", "headcount"]);
    const [wLow, wHigh] = band(workers, [150, 600]);
    const custLow = wLow * bt.workerCaptureRate[0];
    const custHigh = wHigh * bt.workerCaptureRate[1];
    const revLow = custLow * bt.customerAnnualValue[0];
    const revHigh = custHigh * bt.customerAnnualValue[1];
    const assumptions = [
      `${workers ? workers.toLocaleString() : `~${wLow}–${wHigh}`} arriving workers${workers ? "" : " (assumed range)"}`,
      `${pct(bt.workerCaptureRate)} captured → ${Math.round(custLow)}–${Math.round(custHigh)} new ${bt.customerNoun}s`,
      `${formatGBP(bt.customerAnnualValue[0])}–${formatGBP(bt.customerAnnualValue[1])} per ${bt.customerNoun} (${bt.valueBasis})`,
    ];
    return {
      archetype,
      label: bt.key === "recruiter" ? "Hiring contract opportunity" : "Employer growth opportunity",
      revenueLow: revLow,
      revenueHigh: revHigh,
      revenueLabel: rangeLabel(revLow, revHigh, bt.valueBasis),
      basis: bt.valueBasis,
      area,
      score: scoreOf(s.confidence, ctx, revHigh),
      action: bt.key === "recruiter"
        ? `Contact the employer's Head of Talent about the new roles.${goalSuffix(ctx.growthGoal)}`
        : `Target the incoming employer with a corporate/B2B offer.${goalSuffix(ctx.growthGoal)}`,
      assumptions,
      defensive: false,
    };
  }

  if (archetype === "competitor") {
    // Defensive: frame as revenue to protect rather than win.
    const baseCustomers = 8; // assumed existing customers exposed
    const revLow = baseCustomers * bt.customerAnnualValue[0] * 0.25;
    const revHigh = baseCustomers * bt.customerAnnualValue[1] * 0.5;
    return {
      archetype,
      label: "Competitor move",
      revenueLow: revLow,
      revenueHigh: revHigh,
      revenueLabel: rangeLabel(revLow, revHigh, "at risk"),
      basis: "at risk",
      area,
      score: scoreOf(s.confidence, ctx, revHigh),
      action: `Defend share: protect search rankings and run an awareness campaign.${goalSuffix(ctx.growthGoal)}`,
      assumptions: [
        `~${baseCustomers} existing ${bt.customerNoun}s assumed exposed to the move`,
        `25–50% of their value (${formatGBP(bt.customerAnnualValue[0])}–${formatGBP(bt.customerAnnualValue[1])}) treated as at risk`,
      ],
      defensive: true,
    };
  }

  // demand / generic
  const topOpp = s.opportunities[0];
  const customers: [number, number] = [3, 15];
  const conf = topOpp?.confidence ?? s.confidence;
  const revLow = customers[0] * bt.customerAnnualValue[0] * conf;
  const revHigh = customers[1] * bt.customerAnnualValue[1];
  return {
    archetype: "demand",
    label: topOpp?.title ? "Demand opportunity" : "Market opportunity",
    revenueLow: revLow,
    revenueHigh: revHigh,
    revenueLabel: rangeLabel(revLow, revHigh, bt.valueBasis),
    basis: bt.valueBasis,
    area,
    score: scoreOf(s.confidence, ctx, revHigh),
    action: (s.suggestedAction || `Act on this demand signal early to win new ${bt.customerNoun}s.`) + goalSuffix(ctx.growthGoal),
    assumptions: [
      `${customers[0]}–${customers[1]} new ${bt.customerNoun}s assumed from this signal`,
      `${formatGBP(bt.customerAnnualValue[0])}–${formatGBP(bt.customerAnnualValue[1])} per ${bt.customerNoun} (${bt.valueBasis})`,
      `Adjusted by signal confidence (${Math.round(s.confidence * 100)}%)`,
    ],
    defensive: false,
  };
}

function pct(r: [number, number]): string {
  return `${(r[0] * 100).toFixed(r[0] < 0.1 ? 1 : 0)}–${(r[1] * 100).toFixed(r[1] < 0.1 ? 1 : 0)}%`;
}
