import type { Metadata } from "next";
import { Suspense } from "react";
import { FlipDeskBoard } from "./FlipDeskBoard";

export const metadata: Metadata = {
  title: "My Flip Desk — watchlist, wins & profit",
  description:
    "Track auctions you want to bid on, mark wins and losses, and see banked vs planned flip profit.",
  robots: { index: false, follow: false },
};

export default function FlipDeskPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <span className="chip border border-white/10 bg-white/5 text-slate-300">Reseller desk</span>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">My Flip Desk</h1>
        <p className="max-w-2xl text-sm text-slate-400">
          Watch deals, track bids, mark wins, wait for delivery, then sell. Connect eBay for one-click unpublished
          drafts — auction photos stay private reference only.
        </p>
      </header>
      <Suspense fallback={<div className="card p-8 text-center text-sm text-slate-400">Loading your desk…</div>}>
        <FlipDeskBoard />
      </Suspense>
    </div>
  );
}
