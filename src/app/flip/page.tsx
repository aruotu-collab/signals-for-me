import type { Metadata } from "next";
import { Suspense } from "react";
import { FlipBoard } from "./FlipBoard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Flip Radar — liquid auction profit opportunities",
  description:
    "Find UK eBay auctions with profit and live demand. Rank by estimated profit per day, liquidity, competition and auction bid activity.",
  robots: { index: true, follow: true },
};

export default function FlipPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <span className="chip border border-white/10 bg-white/5 text-slate-300">Auction intelligence</span>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Flip Radar</h1>
        <p className="max-w-2xl text-sm text-slate-400">
          Find deals that can turn back into cash—not just paper profit. Every row combines profit, live auction
          demand, active competition, estimated selling time, and expected profit per day.
        </p>
      </header>
      <Suspense fallback={<div className="card p-8 text-center text-sm text-slate-400">Loading Flip Radar…</div>}>
        <FlipBoard />
      </Suspense>
    </div>
  );
}
