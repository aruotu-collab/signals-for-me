"use client";

import { useMemo, useState } from "react";
import {
  EBAY_CATEGORIES,
  MOCK_EBAY_LISTINGS,
  groupMockListingsByCategoryAndHub,
  groupMockListingsByHub,
  isEbayApiConfigured,
  type EbayListing,
} from "@/lib/ebay/mock";

export function DriverOpportunityBoard() {
  const [category, setCategory] = useState<string>("all");
  const [selected, setSelected] = useState<{ category: string; pickupHub: string; listings: EbayListing[] } | null>(
    null,
  );

  const listings = useMemo(
    () => (category === "all" ? MOCK_EBAY_LISTINGS : MOCK_EBAY_LISTINGS.filter((l) => l.category === category)),
    [category],
  );
  const hubs = useMemo(() => groupMockListingsByHub(listings), [listings]);
  const cellMap = useMemo(() => groupMockListingsByCategoryAndHub(listings), [listings]);
  const categories = useMemo(() => {
    const set = new Set(listings.map((l) => l.category));
    return Array.from(set).sort();
  }, [listings]);

  return (
    <div className="space-y-4">
      <div className="card border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-100">
        <strong className="text-amber-200">Preview mode.</strong> Showing sample collection-only auctions. Connect the
        official eBay Browse API to pull live UK listings ending soon, filtered by local pickup.
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCategory("all")}
          className={`chip ${category === "all" ? "bg-brand-500/20 text-brand-200" : "bg-white/5 text-slate-400 hover:text-white"}`}
        >
          All categories
        </button>
        {EBAY_CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`chip ${category === c ? "bg-brand-500/20 text-brand-200" : "bg-white/5 text-slate-400 hover:text-white"}`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="-mx-4 sm:mx-0">
        <div
          className="relative overflow-auto rounded-none border-y border-white/10 sm:rounded-2xl sm:border"
          style={{ maxHeight: "60vh" }}
        >
          <table className="border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 top-0 z-30 w-28 min-w-28 border-b border-r border-white/10 bg-ink-950 px-3 py-3 text-left text-xs font-semibold text-white">
                  Category ↓
                  <div className="mt-0.5 text-[10px] font-normal text-brand-300">Pickup hub →</div>
                </th>
                {hubs.map((h) => (
                  <th
                    key={h.pickupHub}
                    className="sticky top-0 z-20 min-w-[7rem] border-b border-r border-white/10 bg-ink-950 px-2 py-2 text-left align-bottom sm:min-w-[9rem] sm:px-3 sm:py-3"
                  >
                    <div className="text-[9px] font-semibold uppercase tracking-wide text-brand-300/80">📍 Hub</div>
                    <div className="text-xs font-medium text-slate-200 sm:text-sm">{h.pickupHub}</div>
                    <div className="text-[10px] text-slate-500">{h.count} items</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat}>
                  <th className="sticky left-0 z-10 border-b border-r border-white/10 bg-ink-900 px-3 py-2 text-left text-xs font-medium text-white sm:text-sm">
                    {cat}
                  </th>
                  {hubs.map((h) => {
                    const items = cellMap.get(`${cat}|||${h.pickupHub}`) ?? [];
                    if (!items.length) {
                      return (
                        <td key={h.pickupHub} className="border-b border-r border-white/5 bg-ink-950/40 px-2 py-2 text-center text-slate-700">
                          ·
                        </td>
                      );
                    }
                    const areas = new Set(items.map((i) => i.subArea)).size;
                    return (
                      <td key={h.pickupHub} className="border-b border-r border-white/5 px-1.5 py-1.5 sm:px-2 sm:py-2">
                        <button
                          onClick={() => setSelected({ category: cat, pickupHub: h.pickupHub, listings: items })}
                          className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5 text-left transition hover:border-amber-400/40 hover:bg-amber-500/10 sm:px-3 sm:py-2"
                        >
                          <div className="text-xs font-semibold text-white sm:text-sm">{items.length} items</div>
                          {areas > 1 && <div className="text-[10px] text-amber-300/80">{areas} areas</div>}
                          <div className="text-[10px] text-slate-500">ending soon</div>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="card space-y-4 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-brand-300">
                {selected.category} · {selected.pickupHub}
              </div>
              <h3 className="text-lg font-bold text-white">Collection-only auctions</h3>
              <p className="text-xs text-slate-400">Grouped by sub-area — potential delivery work before it hits Shiply.</p>
            </div>
            <button onClick={() => setSelected(null)} className="text-sm text-slate-400 hover:text-white">
              Close
            </button>
          </div>
          <ListingGroups listings={selected.listings} />
        </div>
      )}
    </div>
  );
}

function ListingGroups({ listings }: { listings: EbayListing[] }) {
  const groups = useMemo(() => {
    const map = new Map<string, EbayListing[]>();
    for (const l of listings) {
      const arr = map.get(l.subArea) ?? [];
      arr.push(l);
      map.set(l.subArea, arr);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [listings]);

  return (
    <div className="space-y-4">
      {groups.map(([area, items]) => (
        <section key={area}>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {area} · {items.length} {items.length === 1 ? "item" : "items"}
          </h4>
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id}>
                <a
                  href={item.ebayUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-amber-400/30"
                >
                  <div className="min-w-0">
                    <div className="line-clamp-2 text-sm font-medium text-white">{item.title}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      Ends {new Date(item.endsAt).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    {item.currentBid != null && (
                      <div className="text-sm font-semibold text-white">£{item.currentBid}</div>
                    )}
                    <div className="text-[11px] text-amber-300">View on eBay →</div>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function EbayApiStatus() {
  const connected = isEbayApiConfigured();
  return (
    <span className={`chip ${connected ? "bg-emerald-500/15 text-emerald-200" : "bg-white/5 text-slate-400"}`}>
      eBay API {connected ? "configured" : "not connected"}
    </span>
  );
}
