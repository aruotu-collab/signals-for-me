"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ManualEstimateResult } from "@/lib/ebay/manualEstimate";
import { MATRIX_SERVICE_NAMES } from "@/lib/shiply/parse";
import { formatDriveTime } from "@/lib/shiply/intelligence";
import { requestManualDriverQuotes } from "../actions";

export function ManualJobForm() {
  const router = useRouter();
  const [estimatePending, startEstimate] = useTransition();
  const [quotePending, startQuote] = useTransition();
  const [error, setError] = useState("");
  const [result, setResult] = useState<ManualEstimateResult | null>(null);
  const [form, setForm] = useState({
    itemTitle: "",
    service: MATRIX_SERVICE_NAMES[0] ?? "Furniture & General Items",
    pickupPostcode: "",
    deliveryPostcode: "",
  });

  return (
    <div className="space-y-6">
      <div className="card max-w-2xl space-y-4 p-6">
        <div>
          <h2 className="text-lg font-bold text-white">Post your own delivery job</h2>
          <p className="mt-1 text-sm text-slate-400">
            No eBay link needed. Describe what needs moving, get a guide price, then invite UK drivers to quote —
            like posting on Shiply.
          </p>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            setResult(null);
            const fd = new FormData(e.currentTarget);
            const itemTitle = String(fd.get("itemTitle"));
            const service = String(fd.get("service"));
            const pickupPostcode = String(fd.get("pickupPostcode"));
            const deliveryPostcode = String(fd.get("deliveryPostcode"));
            setForm({ itemTitle, service, pickupPostcode, deliveryPostcode });

            startEstimate(async () => {
              const res = await fetch("/api/quotes/estimate", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ itemTitle, service, pickupPostcode, deliveryPostcode }),
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
            <span className="text-sm font-medium text-slate-300">What needs moving?</span>
            <input
              name="itemTitle"
              required
              defaultValue={form.itemTitle}
              placeholder="e.g. 3-seater sofa, BMW X5, upright piano"
              className="mt-2 w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-300">Category</span>
            <select
              name="service"
              defaultValue={form.service}
              className="mt-2 w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white"
            >
              {MATRIX_SERVICE_NAMES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-300">Pickup postcode</span>
            <input
              name="pickupPostcode"
              required
              defaultValue={form.pickupPostcode}
              placeholder="e.g. M1 1AA"
              className="mt-2 w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-300">Delivery postcode</span>
            <input
              name="deliveryPostcode"
              required
              defaultValue={form.deliveryPostcode}
              placeholder="e.g. EX10 9AB"
              className="mt-2 w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white"
            />
          </label>

          <button type="submit" disabled={estimatePending} className="btn-primary px-5 py-2.5 text-sm disabled:opacity-50">
            {estimatePending ? "Calculating…" : "Get guide estimate"}
          </button>
        </form>

        {error && <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-200">{error}</div>}

        {result && (
          <div className="rounded-xl border border-brand-500/20 bg-brand-500/5 p-4 text-sm text-slate-300">
            <p className="font-medium text-white">{result.message}</p>
            <p className="mt-2 text-xs text-slate-400">
              {result.pickupHub ?? result.pickupPostcode} → {result.deliveryArea}
              {result.driveTimeHours != null && ` · ~${formatDriveTime(result.driveTimeHours)} drive`}
              {result.driversNearby > 0 && ` · ${result.driversNearby} drivers nearby`}
            </p>
          </div>
        )}
      </div>

      {result && result.distanceMiles != null && (
        <form
          className="card max-w-2xl space-y-4 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            const fd = new FormData(e.currentTarget);
            fd.set("estimate", JSON.stringify(result));
            fd.set("itemTitle", form.itemTitle);
            fd.set("service", form.service);
            fd.set("pickupPostcode", form.pickupPostcode);
            fd.set("deliveryPostcode", form.deliveryPostcode);

            startQuote(async () => {
              const res = await requestManualDriverQuotes(fd);
              if (res.error) {
                setError(res.error);
                return;
              }
              if (res.token) router.push(`/quotes/${res.token}`);
            });
          }}
        >
          <h3 className="text-lg font-bold text-white">Request driver quotes</h3>
          <p className="text-sm text-slate-400">
            Drivers on SignalsForMe will see your job and can bid. You&apos;ll get a link to compare quotes.
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
              placeholder="07…"
              className="mt-2 w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-300">Notes for drivers (optional)</span>
            <textarea
              name="notes"
              rows={3}
              placeholder="Access, stairs, dates, dimensions, anything helpful…"
              className="mt-2 w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white"
            />
          </label>

          <p className="text-xs text-slate-500">Enter at least one of email or phone so drivers can reach you.</p>

          <button type="submit" disabled={quotePending} className="btn-primary px-5 py-2.5 text-sm disabled:opacity-50">
            {quotePending ? "Posting job…" : "Post job & request quotes"}
          </button>

          {error && <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-200">{error}</div>}
        </form>
      )}
    </div>
  );
}
