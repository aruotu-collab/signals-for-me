"use client";

import { useState } from "react";
import { DriverOpportunityBoard, EbayApiStatus } from "./DriverOpportunityBoard";
import { DriverQuoteBoard } from "./DriverQuoteBoard";
import { EmptyVanBoard, type ActiveVan } from "./EmptyVanBoard";

type DriverTab = "board" | "quotes" | "empty";

type OpenRequest = {
  id: string;
  source: string;
  service: string | null;
  itemTitle: string | null;
  imageUrl: string | null;
  ebayUrl: string | null;
  pickupHub: string | null;
  pickupPostcode: string | null;
  deliveryPostcode: string;
  distanceMiles: number | null;
  estimateLow: number | null;
  estimateHigh: number | null;
  buyingType: string | null;
  notes: string | null;
  createdAt: Date;
  _count: { bids: number };
  bids: { amount: number }[];
};

export function OpportunitiesView({
  ebayConnected,
  openQuoteRequests,
  quoteHubs,
  hubNames,
  activeVans,
}: {
  ebayConnected: boolean;
  openQuoteRequests: OpenRequest[];
  quoteHubs: { hub: string; count: number }[];
  hubNames: string[];
  activeVans: ActiveVan[];
}) {
  const [driverTab, setDriverTab] = useState<DriverTab>("quotes");

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip border border-white/10 bg-white/5 text-slate-300">eBay collection-only</span>
          <EbayApiStatus connected={ebayConnected} />
          {openQuoteRequests.length > 0 && (
            <span className="chip bg-amber-500/15 text-amber-200">{openQuoteRequests.length} quote jobs open</span>
          )}
          {activeVans.length > 0 && (
            <span className="chip bg-sky-500/15 text-sky-200">{activeVans.length} empty vans available</span>
          )}
        </div>
        <h1 className="text-2xl font-bold text-white">eBay jobs for drivers</h1>
        <p className="max-w-3xl text-sm text-slate-400">
          Win collection-only eBay deliveries before they hit Shiply. Bid on live buyer quote requests, browse
          collection-only listings, or post an empty van for return-load matches.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setDriverTab("quotes")}
          className={`chip ${driverTab === "quotes" ? "bg-amber-500/20 text-amber-200" : "bg-white/5 text-slate-400 hover:text-white"}`}
        >
          Quote requests ({openQuoteRequests.length})
        </button>
        <button
          onClick={() => setDriverTab("empty")}
          className={`chip ${driverTab === "empty" ? "bg-sky-500/20 text-sky-200" : "bg-white/5 text-slate-400 hover:text-white"}`}
        >
          Empty van {activeVans.length > 0 ? `(${activeVans.length})` : ""}
        </button>
        <button
          onClick={() => setDriverTab("board")}
          className={`chip ${driverTab === "board" ? "bg-amber-500/20 text-amber-200" : "bg-white/5 text-slate-400 hover:text-white"}`}
        >
          Collection-only board
        </button>
      </div>

      {driverTab === "quotes" ? (
        <DriverQuoteBoard requests={openQuoteRequests} hubs={quoteHubs} />
      ) : driverTab === "empty" ? (
        <EmptyVanBoard hubNames={hubNames} activeVans={activeVans} openRequests={openQuoteRequests} />
      ) : (
        <DriverOpportunityBoard />
      )}
    </div>
  );
}
