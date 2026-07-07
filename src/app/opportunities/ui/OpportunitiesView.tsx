"use client";

import { useState } from "react";
import { BuyerEstimateForm } from "./BuyerEstimateForm";
import { DriverOpportunityBoard, EbayApiStatus } from "./DriverOpportunityBoard";

type Tab = "drivers" | "buyers";

export function OpportunitiesView({ ebayConnected }: { ebayConnected: boolean }) {
  const [tab, setTab] = useState<Tab>("drivers");

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip border border-white/10 bg-white/5 text-slate-300">eBay collection-only</span>
          <EbayApiStatus connected={ebayConnected} />
        </div>
        <h1 className="text-2xl font-bold text-white">Early delivery opportunities</h1>
        <p className="max-w-3xl text-sm text-slate-400">
          Catch transport work <em>before</em> it becomes a Shiply job. Collection-only eBay auctions are early signals —
          buyers often need a courier but don&apos;t know the cost yet.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <InfoCard
          title="For drivers"
          body="Browse collection-only items by hub and category. Spot auctions ending soon in areas you already cover."
          active={tab === "drivers"}
          onClick={() => setTab("drivers")}
        />
        <InfoCard
          title="For buyers"
          body="Paste an eBay link + your postcode. See if delivery is affordable before you bid on a collection-only item."
          active={tab === "buyers"}
          onClick={() => setTab("buyers")}
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setTab("drivers")}
          className={`chip ${tab === "drivers" ? "bg-brand-500/20 text-brand-200" : "bg-white/5 text-slate-400 hover:text-white"}`}
        >
          Driver board
        </button>
        <button
          onClick={() => setTab("buyers")}
          className={`chip ${tab === "buyers" ? "bg-brand-500/20 text-brand-200" : "bg-white/5 text-slate-400 hover:text-white"}`}
        >
          Buyer estimate
        </button>
      </div>

      {tab === "drivers" ? <DriverOpportunityBoard /> : <BuyerEstimateForm />}
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
