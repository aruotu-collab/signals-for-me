"use client";

import { useMemo, useState, useTransition } from "react";
import { cancelEmptyVanAction, markVanEmptyAction } from "../actions";

export type ActiveVan = {
  id: string;
  driverName: string | null;
  hub: string;
  postcode: string | null;
  headingHub: string | null;
  headingPostcode: string | null;
  vanSize: string | null;
  note: string | null;
  availableUntil: Date;
  createdAt: Date;
};

type OpenRequest = {
  id: string;
  itemTitle: string | null;
  pickupHub: string | null;
  pickupPostcode: string | null;
  deliveryPostcode: string;
  distanceMiles: number | null;
  estimateLow: number | null;
  estimateHigh: number | null;
  _count: { bids: number };
  bids: { amount: number }[];
};

const VAN_SIZES = [
  { value: "small", label: "Small van" },
  { value: "swb", label: "SWB" },
  { value: "lwb", label: "LWB" },
  { value: "luton", label: "Luton / tail-lift" },
  { value: "other", label: "Other" },
];

export function EmptyVanBoard({
  hubNames,
  activeVans,
  openRequests,
}: {
  hubNames: string[];
  activeVans: ActiveVan[];
  openRequests: OpenRequest[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedHub, setSelectedHub] = useState<string>(activeVans[0]?.hub ?? "");
  const [heading, setHeading] = useState<string>(activeVans[0]?.headingHub ?? "any");

  // Return-load matches for the currently selected empty hub + optional heading.
  const matches = useMemo(() => {
    if (!selectedHub) return [];
    return openRequests.filter(
      (r) => r.pickupHub === selectedHub || (heading !== "any" && r.pickupHub === heading),
    );
  }, [openRequests, selectedHub, heading]);

  return (
    <div className="space-y-6">
      <div className="card border border-sky-500/20 bg-sky-500/5 p-4 text-sm text-sky-100">
        <strong className="text-sky-200">Empty van?</strong> Just dropped off and driving back empty? Post where you are
        and where you&apos;re heading. We&apos;ll match you to collection jobs on your route so you don&apos;t drive back
        for nothing.
      </div>

      {/* Mark van empty */}
      <form
        className="card grid gap-4 p-6 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          setError("");
          setSuccess("");
          const fd = new FormData(e.currentTarget);
          startTransition(async () => {
            const res = await markVanEmptyAction(fd);
            if (res.error) setError(res.error);
            else {
              setSuccess("Your empty van is now visible. Buyers near your route will see capacity is available.");
              (e.target as HTMLFormElement).reset();
            }
          });
        }}
      >
        <h3 className="text-lg font-bold text-white sm:col-span-2">Mark your van empty</h3>

        <label className="block">
          <span className="text-xs text-slate-400">Empty in hub *</span>
          <select
            name="hub"
            required
            defaultValue={selectedHub}
            className="mt-1 w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white"
          >
            <option value="">Select hub…</option>
            {hubNames.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs text-slate-400">Current postcode (optional)</span>
          <input
            name="postcode"
            placeholder="e.g. B1 1AA"
            className="mt-1 w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white"
          />
        </label>

        <label className="block">
          <span className="text-xs text-slate-400">Heading towards (optional)</span>
          <select
            name="headingHub"
            defaultValue="any"
            className="mt-1 w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white"
          >
            <option value="any">Local jobs only / not sure</option>
            {hubNames.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs text-slate-400">Available for</span>
          <select
            name="hours"
            defaultValue="24"
            className="mt-1 w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white"
          >
            <option value="6">Next 6 hours</option>
            <option value="12">Today</option>
            <option value="24">24 hours</option>
            <option value="48">2 days</option>
            <option value="72">3 days</option>
          </select>
        </label>

        <label className="block">
          <span className="text-xs text-slate-400">Van size</span>
          <select
            name="vanSize"
            defaultValue="lwb"
            className="mt-1 w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white"
          >
            {VAN_SIZES.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs text-slate-400">Phone *</span>
          <input
            name="driverPhone"
            type="tel"
            required
            placeholder="07…"
            className="mt-1 w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white"
          />
        </label>

        <label className="block">
          <span className="text-xs text-slate-400">Your name (optional)</span>
          <input
            name="driverName"
            className="mt-1 w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white"
          />
        </label>

        <label className="block">
          <span className="text-xs text-slate-400">Email for job alerts (optional)</span>
          <input
            name="driverEmail"
            type="email"
            placeholder="you@example.com"
            className="mt-1 w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="text-xs text-slate-400">Note (optional)</span>
          <input
            name="note"
            placeholder="e.g. can take 1 large item, back-load only, no stairs"
            className="mt-1 w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white"
          />
        </label>

        <button type="submit" disabled={pending} className="btn-primary sm:col-span-2 disabled:opacity-50">
          {pending ? "Posting…" : "Post empty van"}
        </button>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-200 sm:col-span-2">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-200 sm:col-span-2">
            {success}
          </div>
        )}
      </form>

      {/* Return-load matcher */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-white">Return-load matches</h3>
            <p className="text-sm text-slate-400">Open quote jobs you could pick up on your way.</p>
          </div>
          <div className="flex gap-2">
            <label className="text-xs text-slate-400">
              <span className="mb-1 block">Empty in</span>
              <select
                value={selectedHub}
                onChange={(e) => setSelectedHub(e.target.value)}
                className="rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white"
              >
                <option value="">Select hub…</option>
                {hubNames.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-slate-400">
              <span className="mb-1 block">Heading to</span>
              <select
                value={heading}
                onChange={(e) => setHeading(e.target.value)}
                className="rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white"
              >
                <option value="any">Anywhere</option>
                {hubNames.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {!selectedHub ? (
          <div className="card p-8 text-center text-sm text-slate-400">
            Select the hub where your van is empty to see matching jobs.
          </div>
        ) : matches.length === 0 ? (
          <div className="card p-8 text-center text-sm text-slate-400">
            No open jobs picking up in {selectedHub}
            {heading !== "any" ? ` or ${heading}` : ""} right now. Post your empty van above so buyers know you&apos;re
            available — new jobs will match automatically.
          </div>
        ) : (
          <ul className="space-y-3">
            {matches.map((r) => (
              <li key={r.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="line-clamp-1 font-medium text-white">{r.itemTitle ?? "eBay delivery job"}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    {r.pickupHub ?? r.pickupPostcode} → {r.deliveryPostcode}
                    {r.distanceMiles != null && ` · ${r.distanceMiles} mi`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {r.estimateLow != null && (
                    <span className="chip bg-white/5 text-slate-300">
                      Guide £{r.estimateLow}–{r.estimateHigh}
                    </span>
                  )}
                  <span className="chip bg-sky-500/15 text-sky-200">
                    {r.pickupHub === selectedHub ? `Pickup in ${selectedHub}` : `On route to ${heading}`}
                  </span>
                  <span className="chip bg-brand-500/15 text-brand-200">{r._count.bids} bids</span>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-slate-500">
          Bid on these from the <strong>Quote requests</strong> tab.
        </p>
      </section>

      {/* Live empty vans */}
      {activeVans.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-white">Vans currently empty ({activeVans.length})</h3>
          <ul className="space-y-2">
            {activeVans.map((v) => (
              <li key={v.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <div className="text-sm font-medium text-white">
                    {v.driverName ?? "A driver"} · empty in {v.hub}
                    {v.headingHub && <span className="text-sky-300"> → heading {v.headingHub}</span>}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                    {v.vanSize && <span className="chip bg-white/5 text-slate-300">{v.vanSize.toUpperCase()}</span>}
                    <span>Available until {new Date(v.availableUntil).toLocaleString("en-GB")}</span>
                  </div>
                  {v.note && <p className="mt-1 text-xs text-slate-400">{v.note}</p>}
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData();
                    fd.set("id", v.id);
                    startTransition(async () => {
                      await cancelEmptyVanAction(fd);
                    });
                  }}
                >
                  <button type="submit" className="text-xs text-slate-500 hover:text-red-300">
                    I&apos;m no longer free
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
