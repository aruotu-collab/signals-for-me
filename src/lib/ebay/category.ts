/** eBay item category inference — shared by listings, estimates and quote intelligence. */

export const EBAY_CATEGORY_TO_INTEL_SERVICE: Record<string, string> = {
  Furniture: "Other",
  Antiques: "Other",
  Garden: "Other",
  Cars: "Cars",
  Motorcycles: "Motorcycles",
  Pianos: "Pianos",
  Machinery: "Haulage",
  Haulage: "Haulage",
  Pets: "Pets & Livestock",
};

export function inferCategoryFromText(blob: string): string {
  const s = blob.toLowerCase();
  if (/\b(car|vehicle|van|camper)\b/.test(s)) return "Cars";
  if (/\b(motorcycle|motorbike|scooter)\b/.test(s)) return "Motorcycles";
  if (/\b(piano)\b/.test(s)) return "Pianos";
  if (/\b(antique|vintage)\b/.test(s)) return "Antiques";
  if (/\b(sofa|wardrobe|table|bed|furniture|cabinet|dresser)\b/.test(s)) return "Furniture";
  if (/\b(garden|shed|greenhouse|lawnmower)\b/.test(s)) return "Garden";
  if (/\b(pallet|forklift|industrial|machinery|lathe)\b/.test(s)) return "Machinery";
  if (/\b(dog|cat|kennel|crate|horse)\b/.test(s)) return "Pets";
  return "Furniture";
}

export function inferCategoryFromTitle(title: string | null | undefined): string {
  if (!title?.trim()) return "Furniture";
  return inferCategoryFromText(title);
}

export function intelServiceForEbayCategory(category: string): string {
  return EBAY_CATEGORY_TO_INTEL_SERVICE[category] ?? "Other";
}

export function intelServiceFromTitle(title: string | null | undefined): string {
  return intelServiceForEbayCategory(inferCategoryFromTitle(title));
}

export type BidGuideLabel = "below_guide" | "within_guide" | "above_guide" | "unknown";

export function bidGuideLabel(
  amount: number,
  estimateLow: number | null,
  estimateHigh: number | null,
): BidGuideLabel {
  if (estimateLow == null || estimateHigh == null) return "unknown";
  if (amount < estimateLow) return "below_guide";
  if (amount > estimateHigh) return "above_guide";
  return "within_guide";
}

export function bidGuideChip(label: BidGuideLabel): { text: string; className: string } | null {
  switch (label) {
    case "below_guide":
      return { text: "Below guide", className: "bg-emerald-500/15 text-emerald-200" };
    case "within_guide":
      return { text: "Within guide", className: "bg-sky-500/15 text-sky-200" };
    case "above_guide":
      return { text: "Above guide", className: "bg-amber-500/15 text-amber-200" };
    default:
      return null;
  }
}
