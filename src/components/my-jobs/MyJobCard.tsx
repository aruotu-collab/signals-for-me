"use client";

import { useState } from "react";
import type { FavouriteItem } from "@/lib/favourites";
import { profitForJob } from "@/lib/jobProfit";
import type { ShiplyJobLookup } from "@/lib/jobProfit";
import { formatGbp } from "@/lib/shiply/intelligence";
import type { JobIntelSettings } from "@/lib/shiply/intelligence";
import { useFavourites } from "@/components/FavouritesProvider";
import { listingSourceForJob, listingSourceLabel } from "@/lib/shiply/listingSource";

export function MyJobCard({
  job,
  settings,
  shiplyLookup,
}: {
  job: FavouriteItem;
  settings?: JobIntelSettings;
  shiplyLookup?: Map<string, ShiplyJobLookup>;
}) {
  const { remove, markWon, markCompleted, markSaved, updateJob } = useFavourites();
  const [bidOpen, setBidOpen] = useState(false);
  const [bid, setBid] = useState(job.actualBid != null ? String(job.actualBid) : "");
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState(job.notes ?? "");

  const profit = profitForJob(job, settings, shiplyLookup);
  const external = job.url && job.url !== "#";

  const sourceLabel =
    job.source === "manual"
      ? "Manual"
      : job.source === "ebay"
        ? "eBay"
        : listingSourceLabel(listingSourceForJob(job.url ?? "", job.sourceId));
  const sourceClass =
    job.source === "manual"
      ? "bg-violet-500/15 text-violet-200"
      : job.source === "ebay"
        ? "bg-amber-500/15 text-amber-200"
        : "bg-emerald-500/15 text-emerald-200";

  const confirmWon = () => {
    const n = bid.trim() ? Number.parseFloat(bid) : undefined;
    if (bid.trim() && (!Number.isFinite(n!) || n! <= 0)) return;
    markWon(job.key, n);
    setBidOpen(false);
  };

  const saveNotes = () => {
    updateJob(job.key, { notes: notes.trim() || null });
    setNotesOpen(false);
  };

  return (
    <li className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex gap-3">
        {job.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={job.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
        ) : (
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-white/5 text-2xl text-slate-600">
            📦
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="line-clamp-2 text-sm font-medium text-white">{job.title}</div>
          {job.line1 && <div className="mt-1 text-xs text-slate-400">{job.line1}</div>}
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className={`chip ${sourceClass}`}>{sourceLabel}</span>
            {job.service && <span className="chip bg-white/5 text-slate-300">{job.service}</span>}
            {job.detail && <span className="chip bg-white/5 text-slate-300">{job.detail}</span>}
            {profit && (
              <span className="chip bg-emerald-500/15 text-emerald-200">
                {profit.label === "actual" ? "" : "Est. "}
                {formatGbp(profit.profit)} profit
                {profit.hourlyRate != null && ` · £${profit.hourlyRate}/h profit`}
              </span>
            )}
          </div>
          {job.notes && !notesOpen && (
            <p className="mt-2 text-xs italic text-slate-500">{job.notes}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => remove(job.key)}
          aria-label="Remove job"
          className="shrink-0 rounded-lg px-2 py-1 text-amber-300 hover:bg-white/5"
        >
          ★
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/5 pt-3">
        {external && (
          <a
            href={job.url}
            target="_blank"
            rel="noreferrer"
            className="chip bg-brand-500/15 text-brand-200 hover:bg-brand-500/25"
          >
            Open →
          </a>
        )}

        {job.status === "saved" && !bidOpen && (
          <button type="button" onClick={() => setBidOpen(true)} className="chip bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25">
            I won this
          </button>
        )}

        {job.status === "saved" && bidOpen && (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="number"
              min={1}
              placeholder="Your bid £ (optional)"
              value={bid}
              onChange={(e) => setBid(e.target.value)}
              className="w-32 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white"
            />
            <button type="button" onClick={confirmWon} className="chip bg-emerald-500/25 text-emerald-100">
              Confirm won
            </button>
            <button type="button" onClick={() => setBidOpen(false)} className="text-xs text-slate-500">
              Cancel
            </button>
          </div>
        )}

        {job.status === "won" && (
          <>
            <button type="button" onClick={() => markCompleted(job.key)} className="chip bg-brand-500/15 text-brand-200 hover:bg-brand-500/25">
              Mark complete
            </button>
            <button
              type="button"
              onClick={() => {
                setBid(job.actualBid != null ? String(job.actualBid) : "");
                setBidOpen(true);
              }}
              className="chip bg-white/5 text-slate-300 hover:bg-white/10"
            >
              Edit bid
            </button>
          </>
        )}

        {job.status === "won" && bidOpen && (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="number"
              min={1}
              value={bid}
              onChange={(e) => setBid(e.target.value)}
              className="w-28 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white"
            />
            <button
              type="button"
              onClick={() => {
                const n = Number.parseFloat(bid);
                if (Number.isFinite(n) && n > 0) updateJob(job.key, { actualBid: n });
                setBidOpen(false);
              }}
              className="chip bg-white/10 text-white"
            >
              Save
            </button>
          </div>
        )}

        {job.status === "completed" && (
          <button type="button" onClick={() => markSaved(job.key)} className="chip bg-white/5 text-slate-400 hover:bg-white/10">
            Move back to saved
          </button>
        )}

        <button
          type="button"
          onClick={() => setNotesOpen((o) => !o)}
          className="ml-auto text-xs text-slate-500 hover:text-slate-300"
        >
          {notesOpen ? "Cancel notes" : job.notes ? "Edit notes" : "Add notes"}
        </button>
      </div>

      {notesOpen && (
        <div className="mt-2 flex gap-2">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Customer contact, pickup time, gate code…"
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white"
          />
          <button type="button" onClick={saveNotes} className="btn-ghost shrink-0 px-3 py-1 text-xs">
            Save
          </button>
        </div>
      )}
    </li>
  );
}
