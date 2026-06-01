import type { SignalDTO } from "@/lib/types";

// ---------------------------------------------------------------------------
// Opportunity Engine (Phase 1)
// Translates a raw Signal into a business-specific Opportunity: a revenue
// estimate (with transparent assumptions), a recommended action, and a 0-100
// opportunity score. Deterministic + config-driven so it runs with no AI and
// no per-call cost. A future LLM translator can replace `translate()` while
// keeping the same output shape.
//
// Economics are calibrated to public UK benchmarks (2024-2026):
//  - Household size 2.35 residents/home (ONS, Families & Households 2024).
//  - Recruitment fee 15-30% of first-year salary; avg salary ~£30-50k
//    => ~£4k-15k per standard placement (multiple UK agency guides, 2026).
//  - Estate agent avg commission 1.42% inc VAT on ~£268k avg house price
//    => ~£3.8k/sale (HomeOwners Alliance / GOV.UK HPI, 2026).
//  - Dental: £2,000-£5,000/yr per private patient, £55 avg check-up
//    (LaingBuisson / Remedico, 2024-26). We use a conservative blended
//    £400-£1,500/yr new-patient value; high-value treatments are upside.
// Capture rates are deliberately conservative estimates (not yet sourced) and
// surfaced as editable assumptions to the user.
// ---------------------------------------------------------------------------

export type GrowthGoal = "leads" | "revenue" | "locations" | "hiring" | "partnerships";

/**
 * An "opportunity lens" — the business-specific category a signal is presented
 * under. The same redundancy signal is a "Distress / asset acquisition" lens for
 * a pawnbroker but plain "Market demand" for a café. A lens picks the label the
 * user sees, the economics archetype to use, and (optionally) the framing.
 */
export interface Lens {
  key: string;
  label: string;
  /** signal taxonomy types this lens captures */
  types?: string[];
  /** keywords matched against the signal text */
  keywords?: string[];
  /** which economics to use; "auto" = infer from the signal */
  archetype: Archetype | "auto";
  /** force framing as defensive (revenue at risk) */
  defensive?: boolean;
  /** optional bespoke action line */
  action?: string;
}

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
  /**
   * Whether local financial distress (redundancies, closures, insolvencies)
   * is an OPPORTUNITY for this business (pawnbroker, estate agent, insolvency
   * accountant) rather than a risk (most others).
   */
  benefitsFromDistress?: boolean;
  /** business-specific opportunity lenses (presentation + categorisation) */
  lenses?: Lens[];
}

export const BUSINESS_TYPES: BusinessType[] = [
  {
    key: "dentist",
    label: "Dental practice",
    customerNoun: "patient",
    keywords: ["dental", "dentist", "implant", "invisalign", "orthodont", "veneer", "teeth", "tooth", "oral", "whitening", "hygiene"],
    residentsPerHome: 2.35,
    captureRate: [0.03, 0.08],
    customerAnnualValue: [400, 1500],
    workerCaptureRate: [0.02, 0.05],
    valueBasis: "per year",
    lenses: [
      { key: "implant", label: "Implant opportunity", keywords: ["implant", "missing teeth", "tooth loss", "denture"], archetype: "demand" },
      { key: "invisalign", label: "Invisalign / ortho demand", keywords: ["invisalign", "orthodont", "aligner", "braces", "straighten", "veneer", "whitening"], archetype: "demand" },
      { key: "new_movers", label: "New movers", types: ["development", "contractor_appointment"], keywords: ["homes", "dwelling", "residential", "housing", "development"], archetype: "new_resident" },
      { key: "employer", label: "Local employer growth", archetype: "employer", keywords: ["hiring", "jobs", "headcount", "expansion", "workforce"] },
      { key: "competitor", label: "Competitor weakness", keywords: ["closed", "acquired", "merger", "cqc", "complaint", "review", "competitor"], archetype: "competitor" },
      { key: "other", label: "Other demand", archetype: "auto" },
    ],
  },
  {
    key: "accountant",
    label: "Accountancy firm",
    customerNoun: "client",
    keywords: ["account", "bookkeep", "tax", "payroll", "audit", "incorporat", "startup", "sme", "self assessment", "finance"],
    residentsPerHome: 2.35,
    captureRate: [0.005, 0.02],
    customerAnnualValue: [600, 3000],
    workerCaptureRate: [0.005, 0.02],
    valueBasis: "per year",
    // Insolvency, restructuring and administration work is opportunity, not risk.
    benefitsFromDistress: true,
  },
  {
    key: "estate_agent",
    label: "Estate agency",
    customerNoun: "instruction",
    keywords: ["property", "homes", "housing", "development", "residential", "letting", "rent", "landlord", "house price", "regeneration"],
    residentsPerHome: 2.35,
    captureRate: [0.02, 0.06],
    customerAnnualValue: [3000, 6000],
    workerCaptureRate: [0.01, 0.03],
    valueBasis: "one-off",
    // Forced/distressed sales (repossessions, relocations) create instructions.
    benefitsFromDistress: true,
  },
  {
    key: "recruiter",
    label: "Recruitment agency",
    customerNoun: "placement",
    keywords: ["hiring", "recruit", "talent", "job", "headcount", "vacanc", "staffing", "appointed", "expansion", "roles"],
    residentsPerHome: 2.35,
    captureRate: [0.01, 0.04],
    customerAnnualValue: [4000, 15000],
    workerCaptureRate: [0.05, 0.15],
    valueBasis: "one-off",
  },
  {
    key: "marketing_agency",
    label: "Marketing agency",
    customerNoun: "client",
    keywords: ["marketing", "brand", "advertis", "seo", "ppc", "social media", "growth", "campaign", "funding", "launch", "expansion"],
    residentsPerHome: 2.35,
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
    residentsPerHome: 2.35,
    captureRate: [0.005, 0.02],
    customerAnnualValue: [3000, 24000],
    workerCaptureRate: [0.01, 0.04],
    valueBasis: "per year",
  },
  {
    key: "pawnbroker",
    label: "Pawnbroker",
    customerNoun: "deal",
    keywords: ["gold", "jewellery", "jewelry", "watch", "rolex", "loan", "pawn", "luxury", "resale", "second hand", "bullion"],
    residentsPerHome: 2.35,
    // share of financially-affected households that pawn/sell assets
    captureRate: [0.01, 0.04],
    // margin per acquired/loaned item (one-off), not an annual figure
    customerAnnualValue: [80, 400],
    workerCaptureRate: [0.01, 0.03],
    valueBasis: "one-off",
    benefitsFromDistress: true,
    lenses: [
      { key: "gold", label: "Gold opportunities", keywords: ["gold", "bullion", "precious metal", "jewellery", "jewelry"], archetype: "demand" },
      { key: "watches", label: "Luxury watch demand", keywords: ["rolex", "omega", "watch", "luxury", "designer", "handbag"], archetype: "demand" },
      { key: "distress", label: "Distress / asset acquisition", types: ["closure", "insolvency", "redundancy"], keywords: ["redundan", "layoff", "job cuts", "closure", "closing", "insolven", "administration", "liquidation", "cost of living", "repossession"], archetype: "distress" },
      { key: "resale", label: "Resale demand", keywords: ["macbook", "iphone", "console", "playstation", "xbox", "electronics", "second hand"], archetype: "demand" },
      { key: "competitor", label: "Competitor pricing", keywords: ["competitor", "pawn", "payout", "cash converter", "price"], archetype: "competitor" },
      { key: "other", label: "Other demand", archetype: "auto" },
    ],
  },
  {
    key: "generic",
    label: "Other / general",
    customerNoun: "customer",
    keywords: [],
    residentsPerHome: 2.35,
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

const DEFAULT_LENSES: { key: string; label: string }[] = [
  { key: "new_resident", label: "New residents" },
  { key: "employer", label: "New employers" },
  { key: "competitor", label: "Competitor / threats" },
  { key: "distress", label: "Local distress" },
  { key: "demand", label: "Market demand" },
];

/** The opportunity lenses a business sees — its custom set, or the generic ones. */
export function getLenses(bt: BusinessType): { key: string; label: string }[] {
  if (bt.lenses?.length) return bt.lenses.map((l) => ({ key: l.key, label: l.label }));
  return DEFAULT_LENSES;
}

export type Archetype = "new_resident" | "employer" | "competitor" | "demand" | "distress";
export type Urgency = "high" | "medium" | "low";
export type Effort = "low" | "medium" | "high";
/** when the opportunity needs acting on */
export type Horizon = "now" | "30d" | "90d";

export const HORIZON_LABELS: Record<Horizon, string> = {
  now: "Act now",
  "30d": "Within 30 days",
  "90d": "Next 90 days",
};

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
  /** how time-sensitive acting on this is */
  urgency: Urgency;
  /** how much effort acting on this takes */
  effort: Effort;
  /** revenue you could WIN (£). 0 for defensive items. */
  valueLow: number;
  valueHigh: number;
  /** revenue at RISK (£). 0 for offensive items. */
  riskLow: number;
  riskHigh: number;
  /**
   * The single comparison number. Confidence-weighted expected money in play:
   * +£ for an opportunity to win, -£ for revenue at risk. Lets any two
   * opportunities (a funding lead vs a planning approval) be ranked on one scale.
   *   offensive:  +confidence × midpoint(value)
   *   defensive:  -confidence × midpoint(risk)
   */
  expectedValue: number;
  /** typical £ cost to capture / defend this opportunity */
  actionCost: number;
  /** return multiple = |expectedValue| / actionCost (e.g. 28 → "28x") */
  roi: number;
  /** when to act, derived from urgency */
  horizon: Horizon;
  /** ordered, concrete steps to capture the opportunity */
  actionPlan: string[];
  /** the business-specific lens this opportunity falls under (for filtering) */
  lensKey: string;
  /** human label of the lens (== label) */
  lensLabel: string;
}

// translateCore returns everything except the derived value/risk/urgency/effort
// fields, which the public translate() wrapper adds. This keeps the four
// archetype branches focused on the revenue math.
type CoreResult = Omit<
  OpportunityResult,
  | "urgency"
  | "effort"
  | "valueLow"
  | "valueHigh"
  | "riskLow"
  | "riskHigh"
  | "expectedValue"
  | "actionCost"
  | "roi"
  | "horizon"
  | "actionPlan"
>;

export interface TranslateContext {
  location: string;
  growthGoal?: GrowthGoal;
  locationMatch: boolean;
  industryMatch: boolean;
}

// --- helpers ---------------------------------------------------------------

export function formatGBP(n: number): string {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `£${(a / 1_000_000).toFixed(a >= 10_000_000 ? 0 : 1)}m`;
  if (a >= 1_000) return `£${Math.round(a / 1_000)}k`;
  return `£${Math.round(a)}`;
}

/** Signed money, e.g. "+£42k" for a win or "−£8k" for revenue at risk. */
export function formatGBPSigned(n: number): string {
  if (Math.round(n) === 0) return "£0";
  return `${n > 0 ? "+" : "−"}${formatGBP(n)}`;
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

const DISTRESS_RE = /(redundan|layoff|laid off|job cuts|jobs? cut|closure|closing down|shut(s|ting|down)?|insolven|administration|liquidation|receivership|repossession|cost[- ]of[- ]living|bankrupt)/i;

function classify(s: SignalDTO): Archetype {
  const g = s.groupName.toLowerCase();
  const type = s.type.toLowerCase();
  const text = fullText(s);
  if (DISTRESS_RE.test(text)) return "distress";
  if (type === "development" || type === "contractor_appointment" || g.includes("property") || g.includes("construction")) {
    return "new_resident";
  }
  if (["hiring", "exec_hiring", "remote_hiring", "visa_hiring", "expansion"].includes(type)) return "employer";
  if (["competitor_move", "product_launch", "partnership", "acquisition"].includes(type)) return "competitor";
  return "demand";
}

/** Pick the first business lens whose types/keywords match the signal. */
function selectLens(s: SignalDTO, bt: BusinessType): Lens | null {
  if (!bt.lenses?.length) return null;
  const text = fullText(s).toLowerCase();
  for (const lens of bt.lenses) {
    const noFilters = !lens.types?.length && !lens.keywords?.length;
    if (noFilters) return lens; // catch-all (place last)
    const typeHit = lens.types?.includes(s.type) ?? false;
    const kwHit = lens.keywords?.some((k) => text.includes(k)) ?? false;
    if (typeHit || kwHit) return lens;
  }
  return null;
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

const EFFORT_BY_ARCHETYPE: Record<Archetype, Effort> = {
  new_resident: "medium",
  employer: "medium",
  competitor: "high",
  demand: "low",
  distress: "low",
};

// Typical UK cost to actually capture / defend each opportunity type — used to
// turn the expected £ into an ROI multiple. Conservative campaign-level costs:
//   demand: a landing page + small paid test
//   employer: targeted B2B outreach
//   competitor: a defensive retention/awareness push
//   new_resident: a local campaign (ads + direct mail)
const ACTION_COST_BY_ARCHETYPE: Record<Archetype, number> = {
  new_resident: 1500,
  employer: 800,
  competitor: 1000,
  demand: 500,
  distress: 600,
};

const HORIZON_BY_URGENCY: Record<Urgency, Horizon> = {
  high: "now",
  medium: "30d",
  low: "90d",
};

function buildActionPlan(archetype: Archetype, area: string | null, bt: BusinessType): string[] {
  const where = area ?? "your catchment";
  const cust = bt.customerNoun;
  switch (archetype) {
    case "new_resident":
      return [
        `Build a new-resident landing page targeting ${where}`,
        "Run geo-targeted local ads around the development",
        "Send a welcome direct-mail drop before occupancy",
        `Brief your front desk to convert ${cust} enquiries quickly`,
      ];
    case "employer":
      return [
        "Identify the employer's HR / Head of Talent",
        `Send a tailored corporate offer for their incoming staff`,
        "Propose an on-site or staff-perk package",
        "Follow up within 7 days while the move is fresh",
      ];
    case "competitor":
      return [
        "Audit your local search rankings and reviews",
        "Launch a retention + awareness campaign",
        `Reach out to ${cust}s most exposed to the competitor`,
        "Sharpen your differentiator messaging",
      ];
    case "distress":
      return bt.benefitsFromDistress
        ? [
            `Increase local advertising for buying/selling in ${where}`,
            "Raise your buy-in offers on the most in-demand items",
            "Brief staff for higher walk-in seller volume",
            "Promote instant-cash and short-term loan options",
          ]
        : [
            "Introduce flexible payment / finance options",
            `Reassure price-sensitive ${cust}s with value messaging`,
            "Protect retention with a loyalty offer",
            "Monitor local demand weekly",
          ];
    default:
      return [
        "Create a focused landing page for this demand",
        "Run a small paid test campaign",
        `Capture ${cust} leads with a clear, time-boxed offer`,
        "Double down on the channels with positive early ROI",
      ];
  }
}

function daysSince(iso: string): number {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return 999;
  return Math.max(0, (Date.now() - t) / 86_400_000);
}

function urgencyOf(s: SignalDTO, archetype: Archetype): Urgency {
  if (archetype === "competitor") return "high"; // defensive moves are time-critical
  const days = daysSince(s.detectedAt);
  if (days <= 14) return "high";
  if (days <= 60) return "medium";
  return "low";
}

/**
 * Translate a signal into a business opportunity. Wraps the archetype math with
 * the derived dimensions every card/table needs: Value (£), Risk (£), Confidence
 * (carried on the signal), urgency and effort.
 */
export function translate(s: SignalDTO, bt: BusinessType, ctx: TranslateContext): OpportunityResult {
  const core = translateCore(s, bt, ctx);
  const urgency = urgencyOf(s, core.archetype);
  const effort = EFFORT_BY_ARCHETYPE[core.archetype];
  const valueLow = core.defensive ? 0 : core.revenueLow;
  const valueHigh = core.defensive ? 0 : core.revenueHigh;
  const riskLow = core.defensive ? core.revenueLow : 0;
  const riskHigh = core.defensive ? core.revenueHigh : 0;
  const mid = (lo: number, hi: number) => (lo + hi) / 2;
  const expectedValue = core.defensive
    ? -s.confidence * mid(riskLow, riskHigh)
    : s.confidence * mid(valueLow, valueHigh);
  const actionCost = ACTION_COST_BY_ARCHETYPE[core.archetype];
  const roi = actionCost > 0 ? Math.round(Math.abs(expectedValue) / actionCost) : 0;
  const horizon = HORIZON_BY_URGENCY[urgency];
  const actionPlan = buildActionPlan(core.archetype, core.area, bt);
  return {
    ...core,
    urgency,
    effort,
    valueLow,
    valueHigh,
    riskLow,
    riskHigh,
    expectedValue,
    actionCost,
    roi,
    horizon,
    actionPlan,
  };
}

type ArchetypeResult = Omit<CoreResult, "lensKey" | "lensLabel">;

// Apply the business's opportunity lens: it chooses the label the user sees, the
// economics archetype, and (optionally) the framing. Falls back to inferred
// archetype + generic labels for business types with no custom lenses.
function translateCore(s: SignalDTO, bt: BusinessType, ctx: TranslateContext): CoreResult {
  const lens = selectLens(s, bt);
  const archetype: Archetype = lens && lens.archetype !== "auto" ? lens.archetype : classify(s);
  const base = computeArchetype(s, bt, ctx, archetype);
  const label = lens?.label ?? base.label;
  const defensive = lens?.defensive ?? base.defensive;
  const action = lens?.action ? `${lens.action}${goalSuffix(ctx.growthGoal)}` : base.action;
  return {
    ...base,
    label,
    defensive,
    action,
    lensKey: lens?.key ?? base.archetype,
    lensLabel: label,
  };
}

function computeArchetype(
  s: SignalDTO,
  bt: BusinessType,
  ctx: TranslateContext,
  archetype: Archetype,
): ArchetypeResult {
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

  if (archetype === "distress") {
    const affected = extractQuantity(text, ["jobs", "redundancies", "redundant", "employees", "roles", "staff", "workers", "posts"]);
    const [aLow, aHigh] = band(affected, [40, 250]);
    if (bt.benefitsFromDistress) {
      const custLow = aLow * bt.captureRate[0];
      const custHigh = aHigh * bt.captureRate[1];
      const revLow = custLow * bt.customerAnnualValue[0];
      const revHigh = custHigh * bt.customerAnnualValue[1];
      return {
        archetype,
        label: "Asset acquisition opportunity",
        revenueLow: revLow,
        revenueHigh: revHigh,
        revenueLabel: rangeLabel(revLow, revHigh, bt.valueBasis),
        basis: bt.valueBasis,
        area,
        score: scoreOf(s.confidence, ctx, revHigh),
        action: `Increase local advertising and buying offers in ${area ?? "the area"} — expect more sellers.${goalSuffix(ctx.growthGoal)}`,
        assumptions: [
          `${affected ? affected.toLocaleString() : `~${aLow}–${aHigh}`} people financially affected${affected ? "" : " (assumed range)"}`,
          `${pct(bt.captureRate)} sell or borrow against assets → ${Math.round(custLow)}–${Math.round(custHigh)} ${bt.customerNoun}s`,
          `${formatGBP(bt.customerAnnualValue[0])}–${formatGBP(bt.customerAnnualValue[1])} margin per ${bt.customerNoun}`,
        ],
        defensive: false,
      };
    }
    // For most businesses, local distress is demand at risk, not opportunity.
    const revLow = 5 * bt.customerAnnualValue[0] * 0.2;
    const revHigh = 10 * bt.customerAnnualValue[1] * 0.3;
    return {
      archetype,
      label: "Local distress (demand at risk)",
      revenueLow: revLow,
      revenueHigh: revHigh,
      revenueLabel: rangeLabel(revLow, revHigh, "at risk"),
      basis: "at risk",
      area,
      score: scoreOf(s.confidence, ctx, revHigh),
      action: `Protect revenue: offer flexible pricing/finance to retain price-sensitive ${bt.customerNoun}s.${goalSuffix(ctx.growthGoal)}`,
      assumptions: [
        "Local financial distress can cut discretionary spend",
        `5–10 existing ${bt.customerNoun}s' spend treated as partially at risk`,
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
