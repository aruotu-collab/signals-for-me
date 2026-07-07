import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isEbayApiConfigured } from "@/lib/ebay/client";
import { listOpenQuoteRequests, listQuoteRequestHubs } from "@/lib/ebay/quotes";
import { listActiveEmptyVans } from "@/lib/ebay/emptyVans";
import { listHubNames } from "@/lib/shiply/hubs";
import { OpportunitiesView } from "./ui/OpportunitiesView";

export const metadata: Metadata = {
  title: "eBay jobs — collection-only delivery leads for drivers",
  description:
    "Bid on live buyer quote requests, browse collection-only eBay auctions by UK hub, and post empty van availability before jobs hit Shiply.",
};

export const dynamic = "force-dynamic";

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  if (tab === "buyers") redirect("/quotes");

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
