"use client";

import Link from "next/link";
import { useTransition } from "react";
import { updateQuoteStatus } from "./actions";

type Bid = {
  id: string;
  driverName: string | null;
  driverPhone: string;
  driverEmail: string | null;
  amount: number;
  status: string;
  message: string | null;
  createdAt: string;
};

type Quote = {
  id: string;
  publicToken: string;
  source: string;
  status: string;
  itemTitle: string | null;
  ebayUrl: string | null;
  pickupHub: string | null;
  pickupPostcode: string | null;
  deliveryPostcode: string;
  distanceMiles: number | null;
  estimateLow: number | null;
  estimateHigh: number | null;
  buyerEmail: string | null;
  buyerPhone: string | null;
  notes: string | null;
  bidCount: number;
  createdAt: string;
  bids: Bid[];
};

const STATUSES = ["open", "awarded", "won", "closed", "expired"] as const;

export function QuotesManager({
  initialRows,
  counts,
  statusFilter,
}: {
  initialRows: Quote[];
  counts: Record<string, number>;
  statusFilter: string;
}) {
  const [pending, startTransition] = useTransition();

  function setStatus(id: string, status: string) {
    startTransition(async () => {
      await updateQuoteStatus(id, status);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <FilterChip href="/admin/quotes" label="All" count={Object.values(counts).reduce((a, b) => a + b, 0)} active={statusFilter === "all"} />
        {STATUSES.map((s) => (
          <FilterChip
            key={s}
            href={`/admin/quotes?status=${s}`}
            label={s}
            count={counts[s] ?? 0}
            active={statusFilter === s}
          />
        ))}
      </div>

      <div className="space-y-4">
        {initialRows.length === 0 ? (
          <div className="card p-8 text-center text-sm text-slate-400">No quote requests match this filter.</div>
        ) : (
          initialRows.map((row) => (
            <article key={row.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-white/5 px-2 py-0.5 text-xs uppercase text-slate-300">{row.source}</span>
                    <span className="rounded bg-brand-500/15 px-2 py-0.5 text-xs uppercase text-brand-200">{row.status}</span>
                    <span className="text-xs text-slate-500">{new Date(row.createdAt).toLocaleString("en-GB")}</span>
                  </div>
                  <h2 className="mt-2 font-semibold text-white">{row.itemTitle ?? "Untitled job"}</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {row.pickupHub ?? row.pickupPostcode ?? "Pickup TBC"} → {row.deliveryPostcode}
                    {row.distanceMiles != null ? ` · ${row.distanceMiles} mi` : ""}
                    {row.estimateLow != null && row.estimateHigh != null
                      ? ` · est £${row.estimateLow}–£${row.estimateHigh}`
                      : ""}
                  </p>
                  {(row.buyerEmail || row.buyerPhone) && (
                    <p className="mt-1 text-xs text-slate-500">
                      Buyer: {[row.buyerEmail, row.buyerPhone].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {row.notes && <p className="mt-2 text-sm text-slate-400 line-clamp-3">{row.notes}</p>}
                  <div className="mt-2 flex flex-wrap gap-3 text-xs">
                    <Link href={`/quotes/${row.publicToken}`} className="text-brand-300 hover:underline" target="_blank" rel="noreferrer">
                      Public tracker
                    </Link>
                    {row.ebayUrl && (
                      <a href={row.ebayUrl} className="text-brand-300 hover:underline" target="_blank" rel="noreferrer">
                        eBay listing
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <div className="text-sm text-slate-300">
                    {row.bidCount} bid{row.bidCount === 1 ? "" : "s"}
                  </div>
                  <select
                    value={row.status}
                    disabled={pending}
                    onChange={(e) => setStatus(row.id, e.target.value)}
                    className="rounded-lg border border-white/10 bg-ink-900 px-2 py-1.5 text-xs text-slate-200"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {row.bids.length > 0 && (
                <div className="mt-4 overflow-x-auto rounded-xl border border-white/5">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-xs uppercase text-slate-500">
                        <th className="px-3 py-2">When</th>
                        <th className="px-3 py-2">Driver</th>
                        <th className="px-3 py-2">Amount</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Message</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {row.bids.map((b) => (
                        <tr key={b.id} className="text-slate-300">
                          <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">
                            {new Date(b.createdAt).toLocaleString("en-GB")}
                          </td>
                          <td className="px-3 py-2">
                            <div>{b.driverName ?? "—"}</div>
                            <a href={`tel:${b.driverPhone}`} className="text-xs text-brand-300 hover:underline">
                              {b.driverPhone}
                            </a>
                            {b.driverEmail && <div className="text-xs text-slate-500">{b.driverEmail}</div>}
                          </td>
                          <td className="px-3 py-2 font-medium text-white">£{b.amount}</td>
                          <td className="px-3 py-2 text-xs uppercase">{b.status}</td>
                          <td className="px-3 py-2 text-xs text-slate-400 max-w-xs truncate">{b.message ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>
          ))
        )}
      </div>
    </div>
  );
}

function FilterChip({
  href,
  label,
  count,
  active,
}: {
  href: string;
  label: string;
  count: number;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-lg px-3 py-1.5 text-sm capitalize transition ${
        active ? "bg-brand-500/20 text-brand-200" : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
      }`}
    >
      {label} ({count})
    </Link>
  );
}
