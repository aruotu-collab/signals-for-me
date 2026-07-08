"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { DeliveryEstimateResult } from "@/lib/ebay/estimate";
import { formatDriveTime } from "@/lib/shiply/intelligence";
import { requestDriverQuotes } from "../actions";
import { BudgetBreakdown } from "./BudgetBreakdown";

export function BuyerEstimateForm() {
  const router = useRouter();
  const [estimatePending, startEstimate] = useTransition();
  const [quotePending, startQuote] = useTransition();
  const [error, setError] = useState("");
  const [result, setResult] = useState<DeliveryEstimateResult | null>(null);
  const [form, setForm] = useState({ ebayUrl: "", deliveryPostcode: "", pickupPostcode: "" });

  return (
    <div className="space-y-6">
      <div className="card max-w-2xl space-y-4 p-6">
        <div>
          <h2 className="text-lg font-bold text-white">Know your total cost before you bid</h2>
          <p className="mt-1 text-sm text-slate-400">
            Paste a collection-only eBay link and your delivery postcode. Get an instant estimate, then invite drivers
            to quote so you know the full cost before buying.
          </p>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            setResult(null);
            const fd = new FormData(e.currentTarget);
            const ebayUrl = String(fd.get("ebayUrl"));
            const deliveryPostcode = String(fd.get("deliveryPostcode"));
            const pickupPostcode = String(fd.get("pickupPostcode") ?? "");
            setForm({ ebayUrl, deliveryPostcode, pickupPostcode });

            startEstimate(async () => {
              const res = await fetch("/api/ebay/estimate", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ ebayUrl, deliveryPostcode, pickupPostcode: pickupPostcode || undefined }),
              });
              const data = await res.json();
              if (!res.ok) {
                setError(data.error ?? "Estimate failed.");
                return;
              }
              setResult(data.result);
            });
          }}
        >
          <label className="block">
            <span className="text-sm font-medium text-slate-300">eBay item URL</span>
            <input
              name="ebayUrl"
              type="url"
              required
              defaultValue={form.ebayUrl}
              placeholder="https://www.ebay.co.uk/itm/..."
              className="mt-2 w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-300">Your delivery postcode</span>
            <input
              name="deliveryPostcode"
              required
              defaultValue={form.deliveryPostcode}
              placeholder="e.g. EX10 9AB"
              className="mt-2 w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-300">Item pickup postcode (if needed)</span>
            <input
              name="pickupPostcode"
              defaultValue={form.pickupPostcode}
              placeholder="Auto-filled from eBay when available"
              className="mt-2 w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white"
            />
          </label>

          <button type="submit" disabled={estimatePending} className="btn-primary px-5 py-2.5 text-sm disabled:opacity-50">
            {estimatePending ? "Checking item…" : "Step 1 — Get instant estimate"}
          </button>
        </form>

        {error && <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-200">{error}</div>}
      </div>

      {result && (
        <div className="grid gap-6 lg:grid-cols-2">
          <EstimateCard result={result} />

          <form
            className="card space-y-4 p-6"
            onSubmit={(e) => {
              e.preventDefault();
              setError("");
              const fd = new FormData(e.currentTarget);
              fd.set("ebayUrl", form.ebayUrl);
              fd.set("deliveryPostcode", form.deliveryPostcode);
              fd.set("estimate", JSON.stringify(result));

              startQuote(async () => {
                const res = await requestDriverQuotes(fd);
                if (res.error) {
                  setError(res.error);
                  return;
                }
                if (res.token) router.push(`/quotes/${res.token}`);
              });
            }}
          >
            <h3 className="text-lg font-bold text-white">Step 2 — Request driver quotes</h3>
            <p className="text-sm text-slate-400">
              Drivers covering the <span className="text-brand-300">{result.pickupHub ?? "pickup"}</span> area can bid.
              You&apos;ll get a link to compare quotes before you bid on eBay.
            </p>

            <label className="block">
              <span className="text-sm font-medium text-slate-300">Your email</span>
              <input
                name="buyerEmail"
                type="email"
                placeholder="you@example.com"
                className="mt-2 w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-300">Your phone</span>
              <input
                name="buyerPhone"
                type="tel"
                placeholder="07..."
                className="mt-2 w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-300">Your max eBay bid (£, optional)</span>
              <input
                name="maxItemPrice"
                type="number"
                min={0}
                inputMode="decimal"
                placeholder={result.itemPrice != null ? `e.g. ${result.itemPrice} — refines your total budget` : "e.g. 120"}
                className="mt-2 w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-300">Notes for drivers (optional)</span>
              <textarea
                name="notes"
                rows={3}
                placeholder="e.g. narrow driveway, needs 2 people, auction ends tonight 8pm"
                className="mt-2 w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white"
              />
            </label>

            <p className="text-xs text-slate-500">Email or phone required. Quotes stay open for 48 hours.</p>

            <button
              type="submit"
              disabled={quotePending || !result.distanceMiles}
              className="btn-primary w-full px-5 py-2.5 text-sm disabled:opacity-50"
            >
              {quotePending ? "Posting request…" : "Request driver quotes"}
            </button>

            {!result.distanceMiles && (
              <p className="text-xs text-amber-300">Add pickup postcode above to unlock driver quotes.</p>
            )}
          </form>
        </div>
      )}

      <SubscriptionIdeas />
    </div>
  );
}

function EstimateCard({ result }: { result: DeliveryEstimateResult }) {
  return (
    <div className="card space-y-4 p-6">
      <div className="text-xs font-semibold uppercase tracking-wide text-brand-300">Instant estimate</div>
      <div className="flex gap-4">
        {result.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={result.imageUrl} alt="" className="h-20 w-20 shrink-0 rounded-lg object-cover" />
        ) : (
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-lg bg-white/5 text-2xl">📦</div>
        )}
        <div className="min-w-0">
          {result.itemTitle && <h3 className="line-clamp-2 font-semibold text-white">{result.itemTitle}</h3>}
          <div className="mt-1 flex flex-wrap gap-2">
            {result.buyingType && <span className="chip bg-white/5 text-slate-300">{result.buyingType}</span>}
            {result.serviceCategory && <span className="chip bg-violet-500/15 text-violet-200">{result.serviceCategory}</span>}
            {result.pickupHub && <span className="chip bg-brand-500/15 text-brand-200">From {result.pickupHub}</span>}
          </div>
          <a href={result.ebayUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-amber-300 hover:underline">
            View on eBay →
          </a>
        </div>
      </div>

      <p className="text-sm text-slate-300">{result.message}</p>

      {result.distanceMiles != null && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Pickup" value={result.pickupArea ?? "—"} />
          <Stat label="Delivery" value={result.deliveryArea} />
          <Stat label="Distance" value={`${result.distanceMiles} mi`} />
          {result.driveTimeHours != null && (
            <Stat label="Journey time" value={`~${formatDriveTime(result.driveTimeHours)}`} />
          )}
          {result.itemPrice != null && (
            <Stat
              label={result.buyingType === "Auction" ? "Current bid" : "Item price"}
              value={`£${result.itemPrice.toLocaleString("en-GB")}`}
            />
          )}
          {result.estimateLow != null && result.estimateHigh != null && (
            <Stat label="Delivery guide" value={`£${result.estimateLow}–£${result.estimateHigh}`} />
          )}
        </div>
      )}

      {result.estimateLow != null && result.estimateHigh != null && (
        <BudgetBreakdown
          itemPrice={result.itemPrice}
          buyingType={result.buyingType}
          deliveryLow={result.estimateLow}
          deliveryHigh={result.estimateHigh}
          deliverySource="guide"
        />
      )}

      {result.serviceCategory && result.distanceMiles != null && (
        <p className="text-xs text-slate-500">
          Guide based on {result.distanceMiles} mi · {result.serviceCategory} category pricing
          {result.driversNearby > 0 ? ` · ${result.driversNearby} drivers nearby` : ""}.
        </p>
      )}

      {result.driversNearby > 0 && (
        <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 px-4 py-2 text-sm text-sky-200">
          🚐 {result.driversNearby} {result.driversNearby === 1 ? "driver is" : "drivers are"} currently empty near{" "}
          {result.pickupHub ?? "this pickup"} — request quotes to lock in a price before you bid.
        </div>
      )}

      <p className="text-xs text-slate-500">
        Guide price is category-aware (pianos, vehicles, furniture, etc.). Driver quotes may be lower if they&apos;re already doing a route nearby.
      </p>
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

function SubscriptionIdeas() {
  return (
    <div className="card border border-white/5 p-6">
      <h3 className="text-sm font-semibold text-white">Why drivers and buyers will pay for this</h3>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <div className="text-xs font-semibold uppercase text-brand-300">Buyer Pro (coming soon)</div>
          <ul className="mt-2 space-y-1 text-sm text-slate-400">
            <li>· Unlimited quote requests</li>
            <li>· Priority listing — drivers see you first</li>
            <li>· Auction deadline alerts</li>
            <li>· “Total cost” calculator (item + delivery + fees)</li>
          </ul>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase text-amber-300">Driver Pro (coming soon)</div>
          <ul className="mt-2 space-y-1 text-sm text-slate-400">
            <li>· Early access to quote requests in your hubs</li>
            <li>· See buyer contact details instantly</li>
            <li>· Route-match alerts (jobs on your return leg)</li>
            <li>· Verified driver badge on bids</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
