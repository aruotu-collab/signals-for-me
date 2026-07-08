import type { Metadata } from "next";
import { isEbayApiConfigured } from "@/lib/ebay/client";
import { buildPageMetadata } from "@/lib/seo";
import { EbayApiStatus } from "../opportunities/ui/DriverOpportunityBoard";
import { QuotesHub } from "../opportunities/ui/QuotesHub";

export const metadata: Metadata = buildPageMetadata({
  title: "Get a delivery quote — eBay items or your own job",
  description:
    "Paste an eBay link or post your own delivery job. Get an instant UK guide price with journey time, then request driver quotes before you commit.",
  path: "/quotes",
  keywords: [
    "eBay delivery quote",
    "collection only eBay delivery",
    "post delivery job UK",
    "furniture delivery quote",
    "car transport quote",
  ],
});

export default function QuotesPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip border border-white/10 bg-white/5 text-slate-300">Buyer quotes</span>
          <EbayApiStatus connected={isEbayApiConfigured()} />
        </div>
        <h1 className="text-2xl font-bold text-white">Get a delivery quote</h1>
        <p className="max-w-3xl text-sm text-slate-400">
          <strong className="font-medium text-slate-300">eBay item</strong> — paste a collection-only link and know your
          full cost before you bid. <strong className="font-medium text-slate-300">My own job</strong> — post any
          delivery and invite drivers to quote, like Shiply.
        </p>
      </header>

      <QuotesHub />
    </div>
  );
}
