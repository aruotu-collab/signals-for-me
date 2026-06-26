export const URGENCY_OPTIONS = [
  { value: "now", label: "Right now — it's urgent", emoji: "🚨" },
  { value: "today", label: "Today", emoji: "⏱️" },
  { value: "this_week", label: "This week", emoji: "📅" },
] as const;

export type ServiceUrgency = (typeof URGENCY_OPTIONS)[number]["value"];

export const SERVICE_REQUEST_STATUSES = [
  { value: "new", label: "New" },
  { value: "called", label: "Called" },
  { value: "fulfilled", label: "Fulfilled" },
  { value: "spam", label: "Spam" },
] as const;

export function urgencyLabel(urgency: string): string {
  return URGENCY_OPTIONS.find((o) => o.value === urgency)?.label ?? urgency;
}

export function formatRequestLocation(r: {
  locationCountry?: string | null;
  locationRegion?: string | null;
  locationCity?: string | null;
  locationArea?: string | null;
}): string {
  const parts = [r.locationArea, r.locationCity, r.locationRegion, r.locationCountry].filter(Boolean);
  return [...new Set(parts)].join(", ") || "Unknown area";
}

export function resolveCallPhone(campaignPhone?: string | null): string {
  return (campaignPhone || process.env.NEXT_PUBLIC_INTENT_CALL_NUMBER || "").trim();
}

/** Quick-pick emergencies shown on /need hub — matched to catalog service names. */
export const EMERGENCY_QUICK_PICKS = [
  { label: "Flat tire", query: "flat tire" },
  { label: "Locked out", query: "locked out" },
  { label: "Boiler broken", query: "boiler" },
  { label: "Burst pipe", query: "burst pipe" },
  { label: "No electricity", query: "power cut" },
  { label: "Pest problem", query: "pest" },
  { label: "Car won't start", query: "car won't start" },
  { label: "Need a tow", query: "tow truck" },
] as const;
