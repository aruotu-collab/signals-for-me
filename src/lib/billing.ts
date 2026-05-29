// Subscription tiers. Wire these price IDs to Stripe Checkout in production
// (see TECHNICAL_SPEC.md). Kept as plain config so the pricing page + gating
// work without any Stripe keys during development.

export interface Plan {
  id: "free" | "pro" | "team" | "enterprise";
  name: string;
  audience: "consumer" | "business" | "both";
  priceLabel: string;
  pricePerMonth: number | null;
  stripePriceEnv?: string;
  tagline: string;
  features: string[];
  signalLimit: number | null;
  highlight?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    audience: "both",
    priceLabel: "£0",
    pricePerMonth: 0,
    tagline: "Taste the signal feed.",
    features: [
      "10 signals/day",
      "3 signal subscriptions",
      "Weekly email digest",
      "Community signal types",
    ],
    signalLimit: 10,
  },
  {
    id: "pro",
    name: "Pro",
    audience: "consumer",
    priceLabel: "£12",
    pricePerMonth: 12,
    stripePriceEnv: "NEXT_PUBLIC_STRIPE_PRICE_PRO",
    tagline: "For individuals chasing opportunities.",
    features: [
      "Unlimited signals",
      "Unlimited subscriptions",
      "Daily personalized digest",
      "All consumer signal types",
      "Confidence + suggested actions",
    ],
    signalLimit: null,
    highlight: true,
  },
  {
    id: "team",
    name: "Team",
    audience: "business",
    priceLabel: "£49",
    pricePerMonth: 49,
    stripePriceEnv: "NEXT_PUBLIC_STRIPE_PRICE_TEAM",
    tagline: "For sales, recruiting & growth teams.",
    features: [
      "Everything in Pro",
      "All business signal types",
      "Lead-ready company signals",
      "Up to 5 seats",
      "Saved searches + alerts",
    ],
    signalLimit: null,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    audience: "business",
    priceLabel: "Custom",
    pricePerMonth: null,
    tagline: "Intelligence feeds + API.",
    features: [
      "API access",
      "Custom signal types",
      "Bulk export / webhook delivery",
      "SLA + dedicated support",
    ],
    signalLimit: null,
  },
];

export function planById(id: string): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}
