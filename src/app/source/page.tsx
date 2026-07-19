import type { Metadata } from "next";
import { SourceBoard } from "./SourceBoard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "List Today — CJ products likely to sell on eBay",
  description:
    "Scan CJ Dropshipping for products with live UK eBay demand. Ranked by profit per day, competition and opportunity score.",
  robots: { index: true, follow: true },
};

export default function SourcePage() {
  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <span className="chip border border-white/10 bg-white/5 text-slate-300">Sourcing engine</span>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">List Today</h1>
        <p className="max-w-2xl text-sm text-slate-400">
          What should you list today that can sell quickly? We scan CJ Dropshipping, match products to live UK eBay
          Buy-it-now demand, and rank by expected profit per day — not paper margins alone. Flip Radar stays available
          for auction stock.
        </p>
      </header>
      <SourceBoard />
    </div>
  );
}
