// The Signal taxonomy — the full 250+ signal universe from the product vision,
// organized into business and consumer categories. Adding a new signal type is a
// config change here (+ a detection hint), not new application code.

export type Category = "business" | "consumer";

export interface SignalTypeDef {
  /** stable key stored on the Signal record */
  key: string;
  /** human label */
  label: string;
  /** taxonomy group */
  group: string;
  category: Category;
  /** lowercase keyword hints used by the mock provider + cheap pre-filter */
  hints: string[];
  /** whether this type is part of the launch MVP set */
  mvp?: boolean;
}

function t(
  key: string,
  label: string,
  group: string,
  category: Category,
  hints: string[],
  mvp = false,
): SignalTypeDef {
  return { key, label, group, category, hints, mvp };
}

export const SIGNAL_TAXONOMY: SignalTypeDef[] = [
  // ---------------- BUSINESS ----------------
  // Funding
  t("funding", "Funding announced", "Funding Signals", "business", ["raised", "funding", "seed", "series a", "series b", "investment", "venture", "valuation", "round"], true),
  t("venture_debt", "Venture debt raised", "Funding Signals", "business", ["venture debt", "debt facility", "credit line"]),
  t("new_investor", "New investor joined board", "Funding Signals", "business", ["new investor", "joined the board", "board member"]),

  // Hiring
  t("hiring", "Hiring surge", "Hiring Signals", "business", ["hiring", "is hiring", "open roles", "now recruiting", "job opening", "headcount"], true),
  t("exec_hiring", "Executive hiring", "Hiring Signals", "business", ["appointed", "new ceo", "new cfo", "new cto", "chief", "head of"]),
  t("remote_hiring", "Remote hiring expansion", "Hiring Signals", "business", ["remote hiring", "remote-first", "hiring remotely"]),
  t("visa_hiring", "Visa sponsorship hiring", "Hiring Signals", "business", ["visa sponsorship", "sponsor visa", "tier 2", "skilled worker"]),

  // Growth
  t("expansion", "Market / office expansion", "Growth Signals", "business", ["expansion", "new office", "expanding to", "opening in", "new market", "new region"], true),
  t("product_launch", "New product launch", "Growth Signals", "business", ["launches", "launched", "new product", "now available", "introducing"]),
  t("partnership", "Strategic partnership", "Growth Signals", "business", ["partnership", "partners with", "teams up", "collaboration"]),
  t("acquisition", "Acquisition / merger", "Growth Signals", "business", ["acquires", "acquired", "merger", "merges with", "takeover"]),
  t("revenue_milestone", "Revenue milestone", "Growth Signals", "business", ["revenue", "arr", "milestone", "record sales", "crossed"]),

  // Buying intent
  t("buying_intent", "Buying intent", "Buying Intent Signals", "business", ["looking for", "seeking vendor", "evaluating", "rfp", "request for proposal", "procurement", "migrating to", "replacing"], true),
  t("crm_migration", "CRM / ERP migration", "Buying Intent Signals", "business", ["crm migration", "erp migration", "salesforce migration", "moving to"]),
  t("cloud_migration", "Cloud migration", "Buying Intent Signals", "business", ["cloud migration", "moving to aws", "azure migration", "lift and shift"]),
  t("security_procurement", "Cybersecurity procurement", "Buying Intent Signals", "business", ["cybersecurity", "security vendor", "soc 2", "pen test"]),
  t("ai_adoption", "AI adoption initiative", "Buying Intent Signals", "business", ["ai adoption", "adopting ai", "genai initiative", "ai transformation"]),

  // Government
  t("gov_tender", "Government tender", "Government Signals", "business", ["tender", "contract notice", "framework", "public sector", "council", "nhs", "defence"], true),
  t("gov_grant", "Government grant", "Government Signals", "business", ["grant", "innovation funding", "sme grant", "funding programme"]),
  t("smart_city", "Smart city / infrastructure", "Government Signals", "business", ["smart city", "infrastructure programme", "public transport investment"]),

  // Property & construction
  t("development", "Property development", "Property & Construction Signals", "business", ["development", "planning permission", "construction", "build-to-rent", "regeneration", "warehouse"]),
  t("contractor_appointment", "Contractor appointment", "Property & Construction Signals", "business", ["contractor appointed", "main contractor", "construction tender"]),

  // Competitive
  t("competitor_move", "Competitor move", "Competitive Signals", "business", ["competitor", "rival", "market entry", "pricing change"]),

  // Distress
  t("distress", "Distress / risk", "Distress Signals", "business", ["layoffs", "hiring freeze", "office closure", "budget cuts", "revenue warning", "lawsuit", "insolvency", "administration", "profit warning"]),

  // AI & tech
  t("ai_tech", "AI / tech momentum", "AI & Technology Signals", "business", ["ai startup", "open-source", "github", "api launch", "llm", "model release"]),

  // ---------------- CONSUMER ----------------
  // Career
  t("remote_job", "High-paying remote job", "Career Signals", "consumer", ["remote job", "work from home", "remote role", "$", "£", "salary", "hiring remote"], true),
  t("emerging_career", "Emerging career path", "Career Signals", "consumer", ["emerging role", "fastest growing job", "in-demand skill", "new career"]),
  t("freelance", "Freelance / contract opportunity", "Career Signals", "consumer", ["freelance", "contract role", "gig", "day rate"]),

  // Money
  t("money", "Money / savings opportunity", "Money Signals", "consumer", ["savings rate", "cashback", "mortgage rate", "interest rate", "dividend", "tax", "grant"], true),
  t("side_hustle", "Side hustle trend", "Money Signals", "consumer", ["side hustle", "passive income", "earn extra", "make money"], true),
  t("investment_trend", "Investment trend shift", "Money Signals", "consumer", ["investing", "etf", "stock", "crypto", "portfolio"]),

  // Shopping
  t("deal", "Deal / price drop", "Shopping Signals", "consumer", ["price drop", "discount", "sale", "% off", "deal", "clearance", "flash sale"]),
  t("viral_product", "Viral / trending product", "Shopping Signals", "consumer", ["viral", "sold out", "trending product", "everyone is buying"]),

  // Travel
  t("travel_deal", "Travel deal", "Shopping Signals", "consumer", ["cheap flight", "flight deal", "fare drop", "hotel discount", "travel deal", "error fare"], true),

  // AI
  t("ai_tool", "New AI tool", "AI Signals", "consumer", ["new ai tool", "ai app", "ai assistant", "launched ai", "ai productivity", "ai coding"], true),

  // Trends
  t("trend", "Cultural / creator trend", "Trend Signals", "consumer", ["tiktok", "trending", "viral", "creator", "going viral", "trend"]),

  // Local
  t("local_event", "Local event / opportunity", "Local Signals", "consumer", ["event near", "meetup", "job fair", "networking", "opening near", "local"], true),
];

const BY_KEY = new Map(SIGNAL_TAXONOMY.map((s) => [s.key, s]));

export function getSignalType(key: string): SignalTypeDef | undefined {
  return BY_KEY.get(key);
}

export function signalTypesByCategory(category: Category): SignalTypeDef[] {
  return SIGNAL_TAXONOMY.filter((s) => s.category === category);
}

export function mvpSignalTypes(): SignalTypeDef[] {
  return SIGNAL_TAXONOMY.filter((s) => s.mvp);
}

/** Grouped view used by the UI filter sidebar. */
export function groupedTaxonomy(category?: Category) {
  const groups = new Map<string, SignalTypeDef[]>();
  for (const s of SIGNAL_TAXONOMY) {
    if (category && s.category !== category) continue;
    const arr = groups.get(s.group) ?? [];
    arr.push(s);
    groups.set(s.group, arr);
  }
  return Array.from(groups.entries()).map(([group, types]) => ({ group, types }));
}
