/** High-level intent groups for hub pages and classification. */
export const INTENT_GROUPS = [
  { key: "emergency", label: "Emergency", icon: "🚨" },
  { key: "home-services", label: "Home Services", icon: "🏠" },
  { key: "trades", label: "Trades", icon: "🔧" },
  { key: "automotive", label: "Automotive", icon: "🚗" },
  { key: "health", label: "Health", icon: "🦷" },
  { key: "beauty", label: "Beauty", icon: "💅" },
  { key: "pets", label: "Pets", icon: "🐕" },
  { key: "events", label: "Events", icon: "🎉" },
  { key: "business-services", label: "Business Services", icon: "💼" },
  { key: "education", label: "Education", icon: "📚" },
] as const;

export type IntentGroupKey = (typeof INTENT_GROUPS)[number]["key"];

/** Map demand category keys → intent hub group. */
const CATEGORY_TO_GROUP: Record<string, IntentGroupKey> = {
  health: "health",
  automotive: "automotive",
  home: "home-services",
  cleaning: "home-services",
  outdoor: "home-services",
  moving: "home-services",
  laundry: "home-services",
  pets: "pets",
  beauty: "beauty",
  fitness: "health",
  senior: "health",
  childcare: "health",
  education: "education",
  events: "events",
  wedding: "events",
  photography: "events",
  entertainment: "events",
  business: "business-services",
  finance: "business-services",
  legal: "business-services",
  recruitment: "business-services",
  marketing: "business-services",
  design: "business-services",
  writing: "business-services",
  tech: "trades",
  phone: "trades",
  security: "trades",
  insurance: "business-services",
  food: "home-services",
  travel: "automotive",
  logistics: "home-services",
  realestate: "trades",
  retail: "home-services",
  sustainability: "home-services",
  coworking: "business-services",
  tailoring: "home-services",
  music: "education",
  ai: "business-services",
};

const EMERGENCY_KEYWORDS =
  /\b(emergency|urgent|24.?hour|same.?day|broken|leak|locked out|flat tyre|flat tire|no hot water|burst|flooding|stranded)\b/i;

export function intentGroupForCategory(category: string, title: string): IntentGroupKey {
  if (EMERGENCY_KEYWORDS.test(title)) return "emergency";
  return CATEGORY_TO_GROUP[category] ?? "home-services";
}

export function groupLabel(key: string): string {
  return INTENT_GROUPS.find((g) => g.key === key)?.label ?? key;
}
