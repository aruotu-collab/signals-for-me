/**
 * Public product mode. Driver/delivery surfaces stay in the codebase and under
 * /legacy, but are hidden from the main nav and marketing chrome.
 */
export const PUBLIC_PRODUCT = {
  name: "Flip Radar",
  tagline: "Auction profit opportunities before everyone else",
  primaryHref: "/flip",
  /** When false, Pickup Radar / planner / quotes / van tools are hidden from public chrome. */
  showDriverTools: false,
} as const;
