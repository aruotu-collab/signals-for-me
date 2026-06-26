// Subscription tiers for the Demand Intelligence platform.

export interface Plan {
  id: "free" | "starter" | "pro" | "enterprise";
  name: string;
  audience: "consumer" | "business" | "both";
  priceLabel: string;
  pricePerMonth: number | null;
  stripePriceEnv?: string;
  tagline: string;
  features: string[];
  highlight?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    audience: "both",
    priceLabel: "£0",
    pricePerMonth: 0,
    tagline: "Vote for what you want.",
    features: [
      "Browse all demand ideas",
      "Vote & comment",
      "Submit your own ideas",
      "See public demand scores",
    ],
  },
  {
    id: "starter",
    name: "Business Starter",
    audience: "business",
    priceLabel: "£49",
    pricePerMonth: 49,
    stripePriceEnv: "NEXT_PUBLIC_STRIPE_PRICE_STARTER",
    tagline: "See what customers want.",
    features: [
      "Demand intelligence dashboard",
      "Top emerging demands",
      "Category breakdown",
      "Weekly demand digest",
    ],
    highlight: true,
  },
  {
    id: "pro",
    name: "Business Pro",
    audience: "business",
    priceLabel: "£199",
    pricePerMonth: 199,
    stripePriceEnv: "NEXT_PUBLIC_STRIPE_PRICE_PRO",
    tagline: "Full demand intelligence.",
    features: [
      "Everything in Starter",
      "Demographics & geography",
      "Demand growth trends",
      "Pricing & urgency insights",
      "Demand alerts",
      "Opportunity scores",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    audience: "business",
    priceLabel: "Custom",
    pricePerMonth: null,
    tagline: "API + custom research.",
    features: [
      "API access",
      "Custom demand reports",
      "White-label research",
      "Dedicated support & SLA",
    ],
  },
];

export function planById(id: string): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}

export function canAccessDashboard(plan: string): boolean {
  return plan === "starter" || plan === "pro" || plan === "team" || plan === "enterprise";
}

export function canAccessProInsights(plan: string): boolean {
  return plan === "pro" || plan === "enterprise";
}
