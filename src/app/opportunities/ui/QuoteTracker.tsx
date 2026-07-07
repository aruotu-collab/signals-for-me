"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { acceptBid, confirmPurchaseAction } from "../actions";

type Bid = {
  id: string;
  driverName: string | null;
  driverPhone: string;
  amount: number;
  message: string | null;
  etaNotes: string | null;
  status: string;
  createdAt: Date;
};

type Request = {
  id: string;
  publicToken: string;
  itemTitle: string | null;
  imageUrl: string | null;
  ebayUrl: string;
  buyingType: string | null;
  pickupHub: string | null;
  pickupPostcode: string | null;
  deliveryPostcode: string;
  distanceMiles: number | null;
  estimateLow: number | null;
  estimateHigh: number | null;
  auctionEndsAt: Date | null;
  maxItemPrice: number | null;
  status: string;
  expiresAt: Date | null;
  bids: Bid[];
};

export function QuoteTracker({ request, nearbyVans = 0 }: { request: Request; nearbyVans?: number }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [maxBid, setMaxBid] = useState(request.maxItemPrice != null ? String(request.maxItemPrice) : "");

  const lowest = request.bids[0]?.amount;
  const accepted = request.bids.find((b) => b.status === "accepted");
  const deliveryCost = accepted?.amount ?? lowest ?? null;

  const maxBidNum = Number.parseFloat(maxBid);
  const totalCost = useMemo(() => {
    if (!Number.isFinite(maxBidNum) || deliveryCost == null) return null;
    return maxBidNum + deliveryCost;
  }, [maxBidNum, deliveryCost]);

  const countdown = useAuctionCountdown(request.auctionEndsAt);

  return (
    <div className="space-y-6">
      <header className="card p-6">
        <div className="text-xs font-semibold uppercase tracking-wide text-brand-300">Your delivery quote request</div>
        <div className="mt-3 flex gap-4">
          {request.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={request.imageUrl} alt="" className="h-20 w-20 rounded-lg object-cover" />
          ) : (
            <div className="grid h-20 w-20 place-items-center rounded-lg bg-white/5 text-2xl">📦</div>
          )}
          <div>
            <h1 className="text-xl font-bold text-white">{request.itemTitle ?? "eBay item"}</h1>
            <p className="mt-1 text-sm text-slate-400">
              {request.pickupHub ?? request.pickupPostcode} → {request.deliveryPostcode}
              {request.distanceMiles != null && ` · ${request.distanceMiles} mi`}
            </p>
            <a href={request.ebayUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-amber-300">
              Open on eBay →
            </a>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat label="Guide estimate" value={
            request.estimateLow != null && request.estimateHigh != null
              ? `£${request.estimateLow}–£${request.estimateHigh}`
              : "—"
          } />
          <MiniStat label="Driver quotes" value={String(request.bids.length)} />
          <MiniStat label="Lowest bid" value={lowest != null ? `£${lowest}` : "Waiting…"} />
          <MiniStat label="Status" value={request.status} />
        </div>

        {countdown && (
          <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-2 text-sm text-amber-200">
            ⏰ Auction ends in <strong>{countdown}</strong>
          </div>
        )}

        {nearbyVans > 0 && (
          <div className="mt-3 rounded-xl border border-sky-500/20 bg-sky-500/5 px-4 py-2 text-sm text-sky-200">
            🚐 <strong>{nearbyVans}</strong> {nearbyVans === 1 ? "driver is" : "drivers are"} empty near{" "}
            {request.pickupHub ?? "the pickup"} — you&apos;re likely to get competitive quotes.
          </div>
        )}
      </header>

      {/* Total-cost calculator */}
      <section className="card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-300">Max total before you bid</h2>
        <p className="mt-1 text-sm text-slate-400">
          Enter your max eBay bid to see the all-in cost including delivery, so you never overpay.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-4">
          <label className="text-sm text-slate-300">
            <span className="mb-1 block text-xs text-slate-500">Your max eBay bid (£)</span>
            <input
              type="number"
              min={0}
              inputMode="decimal"
              value={maxBid}
              onChange={(e) => setMaxBid(e.target.value)}
              placeholder="e.g. 120"
              className="w-32 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-brand-400"
            />
          </label>
          <div className="text-sm text-slate-300">
            <span className="mb-1 block text-xs text-slate-500">+ Delivery</span>
            <div className="py-2 font-semibold text-white">
              {deliveryCost != null ? `£${deliveryCost}` : "Awaiting quotes"}
            </div>
          </div>
          <div className="text-sm">
            <span className="mb-1 block text-xs text-slate-500">= All-in total</span>
            <div className="py-2 text-lg font-bold text-emerald-300">
              {totalCost != null ? `£${totalCost.toFixed(2)}` : "—"}
            </div>
          </div>
        </div>
      </section>

      {request.status === "open" && (
        <div className="card border border-brand-500/20 bg-brand-500/5 p-4 text-sm text-slate-300">
          Share this page link with yourself — drivers can bid from the <strong>Quote jobs</strong> tab on Opportunities.
          Quotes close {request.expiresAt ? new Date(request.expiresAt).toLocaleString("en-GB") : "in 48 hours"}.
        </div>
      )}

      {accepted && request.status !== "won" && (
        <div className="card border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
          <p>
            You accepted a quote from {accepted.driverName ?? "a driver"} at <strong>£{accepted.amount}</strong>. Contact:{" "}
            {accepted.driverPhone}
          </p>
          <form
            className="mt-3"
            onSubmit={(e) => {
              e.preventDefault();
              setError("");
              const fd = new FormData();
              fd.set("token", request.publicToken);
              startTransition(async () => {
                const res = await confirmPurchaseAction(fd);
                if (res.error) setError(res.error);
              });
            }}
          >
            <button type="submit" disabled={pending} className="btn-primary px-4 py-2 text-sm disabled:opacity-50">
              ✅ I won / bought the item — confirm delivery
            </button>
            <p className="mt-1 text-xs text-emerald-200/70">This notifies your driver the job is confirmed.</p>
          </form>
        </div>
      )}

      {request.status === "won" && accepted && (
        <div className="card border border-emerald-500/40 bg-emerald-500/15 p-4 text-sm text-emerald-100">
          🎉 Purchase confirmed. {accepted.driverName ?? "Your driver"} has been notified and will arrange collection.
          Contact: {accepted.driverPhone}
        </div>
      )}

      {error && <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-200">{error}</div>}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Driver quotes {request.bids.length ? `(lowest first)` : ""}</h2>
        {request.bids.length === 0 ? (
          <div className="card p-8 text-center text-sm text-slate-400">
            No bids yet. Drivers usually respond within a few hours. Check back soon before you bid on eBay.
          </div>
        ) : (
          <ul className="space-y-3">
            {request.bids.map((bid, i) => (
              <li key={bid.id} className="card flex flex-wrap items-center justify-between gap-4 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-500/15 text-sm font-bold text-brand-200">
                      {i + 1}
                    </span>
                    <div>
                      <div className="font-semibold text-white">{bid.driverName ?? "Driver"} · £{bid.amount}</div>
                      <div className="text-xs text-slate-500">{bid.driverPhone}</div>
                    </div>
                  </div>
                  {bid.message && <p className="mt-2 text-sm text-slate-400">{bid.message}</p>}
                  {bid.etaNotes && <p className="text-xs text-slate-500">Availability: {bid.etaNotes}</p>}
                </div>
                {request.status === "open" && bid.status === "pending" && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setError("");
                      const fd = new FormData();
                      fd.set("token", request.publicToken);
                      fd.set("bidId", bid.id);
                      startTransition(async () => {
                        const res = await acceptBid(fd);
                        if (res.error) setError(res.error);
                      });
                    }}
                  >
                    <button type="submit" disabled={pending} className="btn-primary px-4 py-2 text-sm disabled:opacity-50">
                      Accept quote
                    </button>
                  </form>
                )}
                {bid.status === "accepted" && <span className="chip bg-emerald-500/15 text-emerald-200">Accepted</span>}
                {bid.status === "declined" && <span className="chip bg-white/5 text-slate-400">Not chosen</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-sm font-semibold capitalize text-white">{value}</div>
    </div>
  );
}

function useAuctionCountdown(endsAt: Date | null): string | null {
  const end = endsAt ? new Date(endsAt).getTime() : null;
  const [, force] = useState(0);

  useEffect(() => {
    if (end == null) return;
    const id = window.setInterval(() => force((n) => n + 1), 60_000);
    return () => window.clearInterval(id);
  }, [end]);

  if (end == null) return null;
  const diff = end - Date.now();
  if (diff <= 0) return "ended";
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}
