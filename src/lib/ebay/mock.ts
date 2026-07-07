import { isEbayApiConfigured } from "@/lib/ebay/client";
import type { EbayListing } from "@/lib/ebay/types";
import { groupListingsByCategoryAndHub, groupListingsByHub } from "@/lib/ebay/types";

export type { EbayListing } from "@/lib/ebay/types";
export { groupListingsByHub, groupListingsByCategoryAndHub, parseEbayItemId } from "@/lib/ebay/types";
export { isEbayApiConfigured };

// Fallback sample data when API is unavailable or returns empty.
export const MOCK_EBAY_LISTINGS: EbayListing[] = [
  {
    id: "m1",
    title: "Victorian cast iron garden bench — collection only",
    category: "Furniture",
    serviceType: "Deliveries",
    pickupHub: "London",
    subArea: "London SW",
    endsAt: "2026-07-08T18:00:00Z",
    buyingType: "Auction",
    price: 85,
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
    endsAt: null,
    buyingType: "Buy it now",
    price: 120,
    currency: "GBP",
    imageUrl: null,
    ebayUrl: "https://www.ebay.co.uk/",
    collectionOnly: true,
  },
];

export { EBAY_CATEGORIES } from "@/lib/ebay/categories";

// Back-compat aliases
export const groupMockListingsByHub = groupListingsByHub;
export const groupMockListingsByCategoryAndHub = groupListingsByCategoryAndHub;
