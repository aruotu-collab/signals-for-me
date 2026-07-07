import type { Metadata } from "next";
import { isEbayApiConfigured } from "@/lib/ebay/client";
import { listOpenQuoteRequests, listQuoteRequestHubs } from "@/lib/ebay/quotes";
import { listActiveEmptyVans } from "@/lib/ebay/emptyVans";
import { listHubNames } from "@/lib/shiply/hubs";
import { OpportunitiesView } from "./ui/OpportunitiesView";

export const metadata: Metadata = {
  title: "Opportunities — eBay collection-only delivery intelligence",
  description:
    "Find collection-only eBay auctions by UK hub before they become Shiply jobs. Drivers browse early leads; buyers estimate delivery cost and request driver quotes before bidding.",
};

export const dynamic = "force-dynamic";

export default async function OpportunitiesPage() {
  const [openQuoteRequests, quoteHubs, activeVans] = await Promise.all([
    listOpenQuoteRequests({ limit: 30 }),
    listQuoteRequestHubs(),
    listActiveEmptyVans({ limit: 100 }),
  ]);

  const hubNames = listHubNames();

  return (
    <OpportunitiesView
      ebayConnected={isEbayApiConfigured()}
      openQuoteRequests={openQuoteRequests}
      quoteHubs={quoteHubs}
      hubNames={hubNames}
      activeVans={activeVans}
    />
  );
}
