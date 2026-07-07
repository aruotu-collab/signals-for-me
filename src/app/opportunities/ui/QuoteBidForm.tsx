"use client";

import { useMemo, useState, useTransition } from "react";
import { JobIntelligence } from "@/components/shiply/JobIntelligence";
import { bidQualityWarnings, quoteIntelInput } from "@/lib/ebay/quoteIntel";
import { analyzeJob, formatGbp, profitAtPayment } from "@/lib/shiply/intelligence";
import { useDriverSettings } from "@/lib/shiply/driverSettings";
import { placeDriverBid } from "../actions";

type QuoteRequest = {
  id: string;
  itemTitle: string | null;
  ebayUrl: string;
  distanceMiles: number | null;
  estimateLow: number | null;
  notes: string | null;
  _count: { bids: number };
};

export function QuoteBidForm({
  req,
  onSuccess,
}: {
  req: QuoteRequest;
  onSuccess: () => void;
}) {
  const { settings } = useDriverSettings();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const intelInput = quoteIntelInput({
    itemTitle: req.itemTitle,
    distanceMiles: req.distanceMiles,
    bidCount: req._count.bids,
  });
  const intel = intelInput ? analyzeJob(intelInput, settings) : null;
  const [amount, setAmount] = useState(intel ? String(intel.suggestedBid) : req.estimateLow ? String(req.estimateLow) : "");

  const amountNum = Number.parseFloat(amount);
  const warnings = useMemo(() => {
    if (!intelInput || !Number.isFinite(amountNum) || amountNum <= 0) return [];
    return bidQualityWarnings(amountNum, intelInput, settings);
  }, [amountNum, intelInput, settings]);

  const profitPreview = useMemo(() => {
    if (!intelInput || !Number.isFinite(amountNum) || amountNum <= 0) return null;
    return profitAtPayment(amountNum, intelInput, settings);
  }, [amountNum, intelInput, settings]);

  const submit = (e: React.FormEvent<HTMLFormElement>, force = false) => {
    e.preventDefault();
    if (!force && warnings.some((w) => w.level === "error")) {
      if (!confirm(`${warnings[0]!.message}\n\nSubmit this quote anyway?`)) return;
    } else if (!force && warnings.some((w) => w.level === "warn")) {
      if (!confirm(`${warnings[0]!.message}\n\nSubmit anyway?`)) return;
    }
    setError("");
    const fd = new FormData(e.currentTarget);
    fd.set("requestId", req.id);
    startTransition(async () => {
      const res = await placeDriverBid(fd);
      if (res.error) setError(res.error);
      else onSuccess();
    });
  };

  return (
    <div>
      {req.notes && <p className="mb-3 text-sm text-slate-400">Buyer notes: {req.notes}</p>}
      <a href={req.ebayUrl} target="_blank" rel="noreferrer" className="mb-4 inline-block text-xs text-amber-300">
        View eBay item →
      </a>

      {intelInput && <JobIntelligence job={intelInput} heading="Quote intelligence" />}

      <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={submit}>
        <label className="block sm:col-span-2">
          <span className="text-xs text-slate-400">Your quote (£)</span>
          <input
            name="amount"
            type="number"
            min={1}
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={intel ? String(intel.suggestedBid) : "85"}
            className="mt-1 w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white"
          />
          {intel && (
            <button
              type="button"
              onClick={() => setAmount(String(intel.suggestedBid))}
              className="mt-1 text-xs text-brand-300 hover:underline"
            >
              Use suggested £{intel.suggestedBid}
            </button>
          )}
        </label>

        {profitPreview && (
          <div className="sm:col-span-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-200">
            At £{amountNum}: ~{formatGbp(profitPreview.profit)} est. profit · £{profitPreview.hourlyRate}/h profit
          </div>
        )}

        {warnings.map((w) => (
          <div
            key={w.message}
            className={`sm:col-span-2 rounded-lg border px-3 py-2 text-xs ${
              w.level === "error"
                ? "border-red-500/20 bg-red-500/5 text-red-200"
                : "border-amber-500/20 bg-amber-500/5 text-amber-200"
            }`}
          >
            {w.message}
          </div>
        ))}

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

      {error && <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-200">{error}</div>}
    </div>
  );
}
