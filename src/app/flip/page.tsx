import type { Metadata } from "next";
import { FlipBoard } from "./FlipBoard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Flip Radar — auction profit opportunities",
  description:
    "Scan UK eBay auctions ending soon for watches, phones and laptops. Set your profit target and see estimated net profit, ROI and max bid.",
  robots: { index: true, follow: true },
};

export default function FlipPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <span className="chip border border-white/10 bg-white/5 text-slate-300">Auction intelligence</span>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Flip Radar</h1>
        <p className="max-w-2xl text-sm text-slate-400">
          Every row is a money-making lead: current bid vs estimated resale, fees, net profit and confidence. Start with
          watches — set how much you want to make, then bid only on what you&apos;d still buy without the app.
        </p>
      </header>
      <FlipBoard />
    </div>
  );
}
