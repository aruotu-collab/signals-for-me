import type { Metadata } from "next";
import { OpportunitiesView } from "./ui/OpportunitiesView";

export const metadata: Metadata = {
  title: "Opportunities — eBay collection-only delivery intelligence",
  description:
    "Find collection-only eBay auctions by UK hub before they become Shiply jobs. Drivers browse early leads; buyers estimate delivery cost before bidding.",
};

export default function OpportunitiesPage() {
  return <OpportunitiesView />;
}
