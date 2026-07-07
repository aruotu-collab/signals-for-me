import type { Metadata } from "next";
import { isEbayApiConfigured } from "@/lib/ebay/client";
import { BuyerEstimateForm } from "../opportunities/ui/BuyerEstimateForm";
import { EbayApiStatus } from "../opportunities/ui/DriverOpportunityBoard";

export const metadata: Metadata = {
  title: "Get a quote — know your total cost before you bid",
  description:
    "Paste a collection-only eBay link, get an instant delivery estimate, and request driver quotes so you know the full cost before bidding.",
};

export default function QuotesPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip border border-white/10 bg-white/5 text-slate-300">eBay collection-only</span>
          <EbayApiStatus connected={isEbayApiConfigured()} />
        </div>
        <h1 className="text-2xl font-bold text-white">Get a delivery quote</h1>
        <p className="max-w-3xl text-sm text-slate-400">
          Paste an eBay link and your delivery postcode. Get an instant estimate, then invite drivers to quote so you
          know the <strong className="font-medium text-slate-300">full cost before you bid</strong>.
        </p>
      </header>

      <BuyerEstimateForm />
    </div>
  );
}
