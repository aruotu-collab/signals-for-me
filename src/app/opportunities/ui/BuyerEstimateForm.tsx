"use client";

import { useState, useTransition } from "react";
import type { DeliveryEstimateResult } from "@/lib/ebay/estimate";

export function BuyerEstimateForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [result, setResult] = useState<DeliveryEstimateResult | null>(null);
  const [showPickup, setShowPickup] = useState(false);

  return (
    <div className="card max-w-2xl space-y-4 p-6">
      <div>
        <h2 className="text-lg font-bold text-white">Can I afford delivery on this item?</h2>
        <p className="mt-1 text-sm text-slate-400">
          Paste a collection-only eBay link and your delivery postcode. Get a distance-based estimate before you bid.
        </p>
      </div>

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError("");
          setResult(null);
          const fd = new FormData(e.currentTarget);
          startTransition(async () => {
            const res = await fetch("/api/ebay/estimate", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                ebayUrl: fd.get("ebayUrl"),
                deliveryPostcode: fd.get("deliveryPostcode"),
                pickupPostcode: fd.get("pickupPostcode") || undefined,
              }),
            });
            const data = await res.json();
            if (!res.ok) {
              setError(data.error ?? "Estimate failed.");
              return;
            }
            setResult(data.result);
            if (data.result?.message?.includes("pickup postcode")) setShowPickup(true);
          });
        }}
      >
        <label className="block">
          <span className="text-sm font-medium text-slate-300">eBay item URL</span>
          <input
            name="ebayUrl"
            type="url"
            required
            placeholder="https://www.ebay.co.uk/itm/..."
            className="mt-2 w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-300">Your delivery postcode</span>
          <input
            name="deliveryPostcode"
            required
            placeholder="e.g. EX10 9AB"
            className="mt-2 w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white"
          />
        </label>

        {(showPickup || result?.message?.includes("pickup postcode")) && (
          <label className="block">
            <span className="text-sm font-medium text-slate-300">Item pickup postcode (optional)</span>
            <input
              name="pickupPostcode"
              placeholder="e.g. M2 4WU — until eBay API auto-fills this"
              className="mt-2 w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white"
            />
          </label>
        )}

        <button type="submit" disabled={pending} className="btn-primary px-5 py-2.5 text-sm disabled:opacity-50">
          {pending ? "Estimating…" : "Get delivery estimate"}
        </button>
      </form>

      {error && <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-200">{error}</div>}

      {result && (
        <div className="rounded-xl border border-brand-500/20 bg-brand-500/5 p-4 text-sm text-slate-200">
          <p className="text-slate-300">{result.message}</p>
          {result.distanceMiles != null && (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Pickup" value={result.pickupArea ?? "—"} />
              <Stat label="Delivery" value={result.deliveryArea} />
              <Stat label="Distance" value={`${result.distanceMiles} mi`} />
              {result.estimateLow != null && result.estimateHigh != null && (
                <Stat label="Estimate" value={`£${result.estimateLow}–£${result.estimateHigh}`} />
              )}
            </div>
          )}
          {result.itemId && <p className="mt-2 text-xs text-slate-500">eBay item ID: {result.itemId}</p>}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-sm font-semibold text-white">{value}</div>
    </div>
  );
}
