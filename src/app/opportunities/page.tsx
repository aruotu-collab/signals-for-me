import type { Metadata } from "next";
import { isEbayApiConfigured } from "@/lib/ebay/client";
import { listOpenQuoteRequests } from "@/lib/ebay/quotes";
import { OpportunitiesView } from "./ui/OpportunitiesView";

export const metadata: Metadata = {
  title: "Opportunities — eBay collection-only delivery intelligence",
  description:
    "Find collection-only eBay auctions by UK hub before they become Shiply jobs. Drivers browse early leads; buyers estimate delivery cost and request driver quotes before bidding.",
};

export const dynamic = "force-dynamic";

export default async function OpportunitiesPage() {
  const [openQuoteRequests] = await Promise.all([listOpenQuoteRequests(30)]);

  return (
    <OpportunitiesView ebayConnected={isEbayApiConfigured()} openQuoteRequests={openQuoteRequests} />
  );
}
