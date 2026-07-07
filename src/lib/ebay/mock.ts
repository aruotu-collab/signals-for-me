export type EbayListing = {
  id: string;
  title: string;
  category: string;
  serviceType: string;
  pickupHub: string;
  subArea: string;
  endsAt: string;
  currentBid: number | null;
  currency: string;
  imageUrl: string | null;
  ebayUrl: string;
  collectionOnly: boolean;
};

// Illustrative data — replaced by eBay Browse API once credentials are configured.
export const MOCK_EBAY_LISTINGS: EbayListing[] = [
  {
    id: "m1",
    title: "Victorian cast iron garden bench — collection only",
    category: "Antiques",
    serviceType: "Deliveries",
    pickupHub: "London",
    subArea: "London SW",
    endsAt: "2026-07-08T18:00:00Z",
    currentBid: 85,
    currency: "GBP",
    imageUrl: null,
    ebayUrl: "https://www.ebay.co.uk/",
    collectionOnly: true,
  },
  {
    id: "m2",
    title: "Large corner sofa — buyer must arrange collection",
    category: "Furniture",
    serviceType: "Deliveries",
    pickupHub: "London",
    subArea: "London E",
    endsAt: "2026-07-08T12:30:00Z",
    currentBid: 120,
    currency: "GBP",
    imageUrl: null,
    ebayUrl: "https://www.ebay.co.uk/",
    collectionOnly: true,
  },
  {
    id: "m3",
    title: "Yamaha upright piano — local pickup only",
    category: "Pianos",
    serviceType: "Deliveries",
    pickupHub: "Manchester",
    subArea: "Stockport",
    endsAt: "2026-07-09T20:15:00Z",
    currentBid: 250,
    currency: "GBP",
    imageUrl: null,
    ebayUrl: "https://www.ebay.co.uk/",
    collectionOnly: true,
  },
  {
    id: "m4",
    title: "Classic Mini project car — non-runner",
    category: "Cars",
    serviceType: "Vehicle Deliveries",
    pickupHub: "Birmingham",
    subArea: "Solihull",
    endsAt: "2026-07-07T21:00:00Z",
    currentBid: 900,
    currency: "GBP",
    imageUrl: null,
    ebayUrl: "https://www.ebay.co.uk/",
    collectionOnly: true,
  },
  {
    id: "m5",
    title: "Industrial pallet racking — 8 bays",
    category: "Haulage",
    serviceType: "Haulage",
    pickupHub: "Leeds",
    subArea: "Bradford",
    endsAt: "2026-07-10T09:00:00Z",
    currentBid: 320,
    currency: "GBP",
    imageUrl: null,
    ebayUrl: "https://www.ebay.co.uk/",
    collectionOnly: true,
  },
  {
    id: "m6",
    title: "French bulldog stud crate + accessories",
    category: "Pets",
    serviceType: "Pets & Livestock",
    pickupHub: "Bristol",
    subArea: "Bath",
    endsAt: "2026-07-08T16:45:00Z",
    currentBid: 45,
    currency: "GBP",
    imageUrl: null,
    ebayUrl: "https://www.ebay.co.uk/",
    collectionOnly: true,
  },
  {
    id: "m7",
    title: "Motorbike Honda CBR600 — SORN, rolls",
    category: "Motorcycles",
    serviceType: "Vehicle Deliveries",
    pickupHub: "Glasgow",
    subArea: "Paisley",
    endsAt: "2026-07-09T14:00:00Z",
    currentBid: 1100,
    currency: "GBP",
    imageUrl: null,
    ebayUrl: "https://www.ebay.co.uk/",
    collectionOnly: true,
  },
  {
    id: "m8",
    title: "Oak dining table seats 8 — collection from seller",
    category: "Furniture",
    serviceType: "Deliveries",
    pickupHub: "Norwich",
    subArea: "Norwich",
    endsAt: "2026-07-08T19:30:00Z",
    currentBid: 75,
    currency: "GBP",
    imageUrl: null,
    ebayUrl: "https://www.ebay.co.uk/",
    collectionOnly: true,
  },
];

export const EBAY_CATEGORIES = [
  "Furniture",
  "Antiques",
  "Cars",
  "Motorcycles",
  "Pianos",
  "Haulage",
  "Pets",
  "Garden",
  "Machinery",
] as const;

export function groupMockListingsByHub(listings: EbayListing[]) {
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

export function groupMockListingsByCategoryAndHub(listings: EbayListing[]) {
  const map = new Map<string, EbayListing[]>();
  for (const l of listings) {
    const key = `${l.category}|||${l.pickupHub}`;
    const arr = map.get(key) ?? [];
    arr.push(l);
    map.set(key, arr);
  }
  return map;
}

export function isEbayApiConfigured(): boolean {
  return Boolean(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET);
}

export function parseEbayItemId(url: string): string | null {
  try {
    const u = new URL(url);
    const m = u.pathname.match(/\/itm\/(?:[^/]+\/)?(\d+)/) ?? u.searchParams.get("item")?.match(/^\d+$/);
    if (m) return Array.isArray(m) ? m[1] : m;
    const legacy = url.match(/(?:item=|\/itm\/)(\d{8,})/);
    return legacy?.[1] ?? null;
  } catch {
    return null;
  }
}
