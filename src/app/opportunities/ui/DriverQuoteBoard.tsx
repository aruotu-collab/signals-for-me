"use client";

import { useState, useTransition } from "react";
import { placeDriverBid } from "../actions";

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

export function DriverQuoteBoard({ requests }: { requests: OpenRequest[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  return (
    <div className="space-y-4">
      <div className="card border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-100">
        <strong className="text-amber-200">Quote jobs</strong> — buyers need delivery on collection-only eBay items
        before they bid. Submit your price; lowest useful quote often wins.
      </div>

      {requests.length === 0 ? (
        <div className="card p-8 text-center text-sm text-slate-400">
          No open quote requests right now. Check the collection-only board for early leads, or check back soon.
        </div>
      ) : (
        <ul className="space-y-3">
          {requests.map((req) => (
            <li key={req.id} className="card overflow-hidden">
              <button
                type="button"
                onClick={() => setExpanded(expanded === req.id ? null : req.id)}
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

              {expanded === req.id && (
                <div className="border-t border-white/10 p-4">
                  {req.notes && <p className="mb-3 text-sm text-slate-400">Buyer notes: {req.notes}</p>}
                  <a href={req.ebayUrl} target="_blank" rel="noreferrer" className="mb-4 inline-block text-xs text-amber-300">
                    View eBay item →
                  </a>

                  <form
                    className="grid gap-3 sm:grid-cols-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      setError("");
                      setSuccess("");
                      const fd = new FormData(e.currentTarget);
                      fd.set("requestId", req.id);
                      startTransition(async () => {
                        const res = await placeDriverBid(fd);
                        if (res.error) setError(res.error);
                        else {
                          setSuccess("Quote submitted!");
                          setExpanded(null);
                        }
                      });
                    }}
                  >
                    <label className="block sm:col-span-2">
                      <span className="text-xs text-slate-400">Your quote (£)</span>
                      <input
                        name="amount"
                        type="number"
                        min={1}
                        required
                        placeholder={req.estimateLow ? String(req.estimateLow) : "85"}
                        className="mt-1 w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs text-slate-400">Your name</span>
                      <input name="driverName" className="mt-1 w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white" />
                    </label>
                    <label className="block">
                      <span className="text-xs text-slate-400">Phone *</span>
                      <input name="driverPhone" type="tel" required className="mt-1 w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white" />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="text-xs text-slate-400">Message</span>
                      <textarea name="message" rows={2} placeholder="e.g. Luton van, blankets included" className="mt-1 w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white" />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="text-xs text-slate-400">When can you collect?</span>
                      <input name="etaNotes" placeholder="e.g. Saturday AM, or within 48h of auction win" className="mt-1 w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white" />
                    </label>
                    <button type="submit" disabled={pending} className="btn-primary sm:col-span-2 disabled:opacity-50">
                      {pending ? "Submitting…" : "Submit quote"}
                    </button>
                  </form>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {error && <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-200">{error}</div>}
      {success && <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-200">{success}</div>}
    </div>
  );
}
