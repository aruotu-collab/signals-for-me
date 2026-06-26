export interface IntentModifier {
  slug: string;
  label: string;
  intentLevel: "high" | "medium";
  /** Prefix for H1 / meta, e.g. "Emergency" */
  prefix: string;
}

export const INTENT_MODIFIERS: IntentModifier[] = [
  { slug: "near-me", label: "Near me", intentLevel: "high", prefix: "" },
  { slug: "emergency", label: "Emergency", intentLevel: "high", prefix: "Emergency" },
  { slug: "same-day", label: "Same day", intentLevel: "high", prefix: "Same-day" },
  { slug: "24-hour", label: "24 hour", intentLevel: "high", prefix: "24-hour" },
  { slug: "cheap", label: "Cheap", intentLevel: "medium", prefix: "Affordable" },
  { slug: "open-now", label: "Open now", intentLevel: "high", prefix: "Open now" },
  { slug: "today", label: "Today", intentLevel: "high", prefix: "Today" },
  { slug: "local", label: "Local", intentLevel: "medium", prefix: "Local" },
  { slug: "mobile", label: "Mobile", intentLevel: "high", prefix: "Mobile" },
  { slug: "cost", label: "Cost", intentLevel: "medium", prefix: "" },
];

export const DEFAULT_MODIFIER = INTENT_MODIFIERS[0];

export function modifierBySlug(slug: string): IntentModifier {
  return INTENT_MODIFIERS.find((m) => m.slug === slug) ?? DEFAULT_MODIFIER;
}
