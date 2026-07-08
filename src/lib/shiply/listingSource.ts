export type ListingSource = "deliveryquotecompare" | "shiply" | "unknown";

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
