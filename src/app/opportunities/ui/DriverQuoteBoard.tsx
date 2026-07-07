"use client";

import { useState } from "react";
import { quoteCategory } from "@/lib/ebay/quoteIntel";
import { QuoteBidForm } from "./QuoteBidForm";

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

export function DriverQuoteBoard({
  requests,
  hubs = [],
}: {
  requests: OpenRequest[];
  hubs?: { hub: string; count: number }[];
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [success, setSuccess] = useState("");
  const [hubFilter, setHubFilter] = useState<string>("all");

  const filtered = hubFilter === "all" ? requests : requests.filter((r) => r.pickupHub === hubFilter);

  return (
    <div className="space-y-4">
      <div className="card border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-100">
        <strong className="text-amber-200">Quote jobs</strong> — buyers need delivery on collection-only eBay items
        before they bid. Route intelligence shows fuel, profit and suggested quotes based on your van settings.
      </div>

      {hubs.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">Filter by pickup hub:</span>
          <button
            type="button"
            onClick={() => setHubFilter("all")}
            className={`chip ${hubFilter === "all" ? "bg-brand-500/20 text-brand-200" : "bg-white/5 text-slate-400 hover:text-white"}`}
          >
            All ({requests.length})
          </button>
          {hubs.map((h) => (
            <button
              key={h.hub}
              type="button"
              onClick={() => setHubFilter(h.hub)}
              className={`chip ${hubFilter === h.hub ? "bg-brand-500/20 text-brand-200" : "bg-white/5 text-slate-400 hover:text-white"}`}
            >
              {h.hub} ({h.count})
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="card p-8 text-center text-sm text-slate-400">
          {hubFilter === "all"
            ? "No open quote requests right now. Check the collection-only board for early leads, or check back soon."
            : `No open quote requests in ${hubFilter}. Try another hub or view all.`}
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((req) => {
            const category = quoteCategory(req.itemTitle);
            const isOpen = expanded === req.id;

            return (
              <li key={req.id} className="card overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : req.id)}
                  className="flex w-full items-start gap-4 p-4 text-left hover:bg-white/[0.02]"
                >
                  {req.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={req.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-white/5">📦</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 font-medium text-white">{req.itemTitle ?? "eBay delivery job"}</div>
                    <div className="mt-1 text-xs text-slate-400">
                      {req.pickupHub ?? req.pickupPostcode} → {req.deliveryPostcode}
                      {req.distanceMiles != null && ` · ${req.distanceMiles} mi`}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="chip bg-violet-500/15 text-violet-200">{category}</span>
                      {req.estimateLow != null && (
                        <span className="chip bg-white/5 text-slate-300">
                          Guide £{req.estimateLow}–{req.estimateHigh}
                        </span>
                      )}
                      <span className="chip bg-brand-500/15 text-brand-200">{req._count.bids} bids</span>
                      {req.bids[0] && <span className="chip bg-emerald-500/15 text-emerald-200">Low £{req.bids[0].amount}</span>}
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-white/10 p-4">
                    <QuoteBidForm
                      req={req}
                      onSuccess={() => {
                        setSuccess("Quote submitted!");
                        setExpanded(null);
                      }}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {success && <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-200">{success}</div>}
    </div>
  );
}
