"use client";

import { useState } from "react";
import { BuyerEstimateForm } from "./BuyerEstimateForm";
import { DriverOpportunityBoard, EbayApiStatus } from "./DriverOpportunityBoard";
import { DriverQuoteBoard } from "./DriverQuoteBoard";
import { EmptyVanBoard, type ActiveVan } from "./EmptyVanBoard";

type Tab = "drivers" | "buyers";
type DriverTab = "board" | "quotes" | "empty";

type OpenRequest = {
  id: string;
  itemTitle: string | null;
  imageUrl: string | null;
  ebayUrl: string;
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
  const [tab, setTab] = useState<Tab>("buyers");
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
        <h1 className="text-2xl font-bold text-white">Early delivery opportunities</h1>
        <p className="max-w-3xl text-sm text-slate-400">
          Buyers get delivery quotes <em>before</em> bidding on eBay. Drivers win jobs earlier than Shiply — collection-only
          listings and live quote requests in one place.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <InfoCard
          title="For buyers"
          body="Paste an eBay link, get an instant estimate, then request driver quotes so you know the full cost before you bid."
          active={tab === "buyers"}
          onClick={() => setTab("buyers")}
        />
        <InfoCard
          title="For drivers"
          body="Bid on live quote requests, browse collection-only listings, or post an empty van to get matched with return loads on your route."
          active={tab === "drivers"}
          onClick={() => setTab("drivers")}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setTab("buyers")}
          className={`chip ${tab === "buyers" ? "bg-brand-500/20 text-brand-200" : "bg-white/5 text-slate-400 hover:text-white"}`}
        >
          Buyer quotes
        </button>
        <button
          onClick={() => setTab("drivers")}
          className={`chip ${tab === "drivers" ? "bg-brand-500/20 text-brand-200" : "bg-white/5 text-slate-400 hover:text-white"}`}
        >
          Driver jobs
        </button>
        {tab === "drivers" && (
          <>
            <span className="text-slate-600">|</span>
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
          </>
        )}
      </div>

      {tab === "buyers" ? (
        <BuyerEstimateForm />
      ) : driverTab === "quotes" ? (
        <DriverQuoteBoard requests={openQuoteRequests} hubs={quoteHubs} />
      ) : driverTab === "empty" ? (
        <EmptyVanBoard hubNames={hubNames} activeVans={activeVans} openRequests={openQuoteRequests} />
      ) : (
        <DriverOpportunityBoard />
      )}
    </div>
  );
}

function InfoCard({
  title,
  body,
  active,
  onClick,
}: {
  title: string;
  body: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`card p-4 text-left transition ${active ? "border-brand-400/40 ring-1 ring-brand-400/20" : "hover:border-white/20"}`}
    >
      <div className="text-sm font-semibold text-white">{title}</div>
      <p className="mt-1 text-sm text-slate-400">{body}</p>
    </button>
  );
}
