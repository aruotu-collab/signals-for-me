export type BuyingType = "Auction" | "Buy it now" | "Best offer";

export type EbayListing = {
  id: string;
  title: string;
  category: string;
  serviceType: string;
  pickupHub: string;
  subArea: string;
  endsAt: string | null;
  buyingType: BuyingType;
  price: number | null;
  currency: string;
  imageUrl: string | null;
  ebayUrl: string;
  collectionOnly: boolean;
};

export function groupListingsByHub(listings: EbayListing[]) {
  const hubs = new Map<string, { count: number; areas: Set<string> }>();
  for (const l of listings) {
    const e = hubs.get(l.pickupHub) ?? { count: 0, areas: new Set<string>() };
    e.count += 1;
    e.areas.add(l.subArea);
    hubs.set(l.pickupHub, e);
  }
  return Array.from(hubs.entries())
    .map(([pickupHub, v]) => ({ pickupHub, count: v.count, areaCount: v.areas.size }))
    .sort((a, b) => b.count - a.count);
}

export function groupListingsByCategoryAndHub(listings: EbayListing[]) {
  const map = new Map<string, EbayListing[]>();
  for (const l of listings) {
    const key = `${l.category}|||${l.pickupHub}`;
    const arr = map.get(key) ?? [];
    arr.push(l);
    map.set(key, arr);
  }
  return map;
}

export function parseEbayItemId(url: string): string | null {
  try {
    const u = new URL(url);
    const pathMatch = u.pathname.match(/\/itm\/(?:[^/]+\/)?(\d+)/);
    if (pathMatch?.[1]) return pathMatch[1];
    const itemParam = u.searchParams.get("item");
    if (itemParam && /^\d+$/.test(itemParam)) return itemParam;
    const legacy = url.match(/(?:item=|\/itm\/)(\d{8,})/);
    return legacy?.[1] ?? null;
  } catch {
    const legacy = url.match(/(?:item=|\/itm\/)(\d{8,})/);
    return legacy?.[1] ?? null;
  }
}
