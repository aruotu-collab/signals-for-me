"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { bidGuideChip, bidGuideLabel } from "@/lib/ebay/category";
import { quoteCategory } from "@/lib/ebay/quoteIntel";
import { estimateTravelHours, formatDriveTime } from "@/lib/shiply/intelligence";
import { acceptBid, confirmPurchaseAction } from "../actions";
import { BudgetBreakdown } from "./BudgetBreakdown";

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
  itemPrice: number | null;
  maxItemPrice: number | null;
  status: string;
  expiresAt: Date | null;
  bids: Bid[];
};

export function QuoteTracker({ request, nearbyVans = 0 }: { request: Request; nearbyVans?: number }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [maxBid, setMaxBid] = useState(
    request.maxItemPrice != null
      ? String(request.maxItemPrice)
      : request.itemPrice != null
        ? String(request.itemPrice)
        : "",
  );

  const lowest = request.bids[0]?.amount;
  const accepted = request.bids.find((b) => b.status === "accepted");

  const deliverySource: "guide" | "lowest" | "accepted" = accepted
    ? "accepted"
    : lowest != null
      ? "lowest"
      : "guide";

  const deliveryActual = accepted?.amount ?? lowest ?? null;
  const maxBidNum = Number.parseFloat(maxBid);
  const itemOverride = Number.isFinite(maxBidNum) && maxBidNum > 0 ? maxBidNum : null;
  const itemForTotal = itemOverride ?? request.itemPrice;

  const totalCost = useMemo(() => {
    if (itemForTotal == null || deliveryActual == null) return null;
    return itemForTotal + deliveryActual;
  }, [itemForTotal, deliveryActual]);

  const countdown = useAuctionCountdown(request.auctionEndsAt);
  const category = quoteCategory(request.itemTitle);
  const driveTimeHours = estimateTravelHours(request.distanceMiles);

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
              {driveTimeHours != null && ` · ~${formatDriveTime(driveTimeHours)} drive`}
              {` · ${category}`}
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
          <MiniStat label="Category" value={category} />
          <MiniStat label="Driver quotes" value={String(request.bids.length)} />
          <MiniStat label="Lowest bid" value={lowest != null ? `£${lowest}` : "Waiting…"} />
        </div>
        <p className="mt-2 text-xs capitalize text-slate-500">Status: {request.status}</p>

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

      <BudgetBreakdown
        itemPrice={request.itemPrice}
        buyingType={request.buyingType}
        deliveryLow={request.estimateLow}
        deliveryHigh={request.estimateHigh}
        deliveryActual={deliveryActual}
        deliverySource={deliverySource}
        itemOverride={itemOverride}
      />

      {/* Interactive max-bid tweak */}
      <section className="card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-300">Adjust your budget</h2>
        <p className="mt-1 text-sm text-slate-400">
          {accepted
            ? "Delivery is locked to your accepted quote. Update your max item bid to see the final all-in total."
            : lowest != null
              ? "Delivery uses the lowest driver quote so far. Accept a quote to lock it in."
              : "No driver quotes yet — delivery uses the guide estimate until bids arrive."}
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-4">
          <label className="text-sm text-slate-300">
            <span className="mb-1 block text-xs text-slate-500">
              {request.buyingType === "Auction" ? "Your max item bid (£)" : "Item cost (£)"}
            </span>
            <input
              type="number"
              min={0}
              inputMode="decimal"
              value={maxBid}
              onChange={(e) => setMaxBid(e.target.value)}
              placeholder={request.itemPrice != null ? String(request.itemPrice) : "e.g. 120"}
              className="w-32 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-brand-400"
            />
          </label>
          {request.itemPrice != null && request.buyingType === "Auction" && (
            <p className="pb-2 text-xs text-slate-500">
              Current eBay bid: £{request.itemPrice.toLocaleString("en-GB")}
            </p>
          )}
        </div>
      </section>

      {/* Legacy inline total — keep visible when calculator has values */}
      {totalCost != null && (
        <div className="card border border-emerald-500/30 bg-emerald-500/5 p-4 text-center">
          <div className="text-xs uppercase tracking-wide text-emerald-300/80">All-in total</div>
          <div className="mt-1 text-3xl font-bold text-emerald-200">£{totalCost.toLocaleString("en-GB")}</div>
          <p className="mt-1 text-xs text-slate-400">
            £{itemForTotal!.toLocaleString("en-GB")} item + £{deliveryActual!.toLocaleString("en-GB")}{" "}
            {deliverySource === "accepted" ? "accepted delivery" : deliverySource === "lowest" ? "lowest quote" : "guide"}
          </p>
        </div>
      )}

      {request.status === "open" && (
        <div className="card border border-brand-500/20 bg-brand-500/5 p-4 text-sm text-slate-300">
          Share this page link with yourself — drivers can bid from <strong>Quote requests</strong> on eBay jobs.
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
            {request.bids.map((bid, i) => {
              const guide = bidGuideLabel(bid.amount, request.estimateLow, request.estimateHigh);
              const guideChip = bidGuideChip(guide);
              return (
              <li key={bid.id} className="card flex flex-wrap items-center justify-between gap-4 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-500/15 text-sm font-bold text-brand-200">
                      {i + 1}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-white">{bid.driverName ?? "Driver"} · £{bid.amount}</span>
                        {guideChip && <span className={`chip ${guideChip.className}`}>{guideChip.text}</span>}
                      </div>
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
            );
            })}
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
