export type ListingSource = "deliveryquotecompare" | "shiply" | "unknown";

/** UI filter: all sources, or one marketplace. */
export type ListingSourceFilter = "all" | "shiply" | "deliveryquotecompare";

export const LISTING_SOURCE_FILTERS: { id: ListingSourceFilter; label: string }[] = [
  { id: "all", label: "All sources" },
  { id: "shiply", label: "Shiply" },
  { id: "deliveryquotecompare", label: "DeliveryQuoteCompare" },
];

export function listingSourceFromUrl(url: string): ListingSource {
  const u = url.toLowerCase();
  if (u.includes("deliveryquotecompare.com")) return "deliveryquotecompare";
  if (u.includes("shiply.com")) return "shiply";
  return "unknown";
}

export function listingSourceFromKey(key: string): ListingSource {
  if (key.startsWith("DQC-")) return "deliveryquotecompare";
  return "shiply";
}

export function listingSourceForJob(url: string, key?: string): ListingSource {
  const fromUrl = listingSourceFromUrl(url);
  if (fromUrl !== "unknown") return fromUrl;
  if (key) return listingSourceFromKey(key);
  return "unknown";
}

export function listingSourceLabel(source: ListingSource): string {
  switch (source) {
    case "deliveryquotecompare":
      return "DeliveryQuoteCompare";
    case "shiply":
      return "Shiply";
    default:
      return "listing";
  }
}

export function openOnListingLabel(url: string, key?: string): string {
  const source = listingSourceForJob(url, key);
  if (source === "unknown") return "Open on listing";
  return `Open on ${listingSourceLabel(source)}`;
}

export function parseListingSourceFilter(raw?: string | null): ListingSourceFilter {
  if (raw === "shiply" || raw === "deliveryquotecompare") return raw;
  return "all";
}

export function keyMatchesSourceFilter(key: string, filter: ListingSourceFilter): boolean {
  if (filter === "all") return true;
  return listingSourceFromKey(key) === filter;
}

export function filterKeysBySource(keys: string[], filter: ListingSourceFilter): string[] {
  if (filter === "all") return keys;
  return keys.filter((k) => keyMatchesSourceFilter(k, filter));
}

/** Prisma where fragment keyed on shiplyKey (DQC- prefix = DeliveryQuoteCompare). */
export function listingSourcePrismaWhere(filter: ListingSourceFilter):
  | { shiplyKey: { startsWith: string } }
  | { shiplyKey: { not: { startsWith: string } } }
  | Record<string, never> {
  if (filter === "deliveryquotecompare") return { shiplyKey: { startsWith: "DQC-" } };
  if (filter === "shiply") return { shiplyKey: { not: { startsWith: "DQC-" } } };
  return {};
}
