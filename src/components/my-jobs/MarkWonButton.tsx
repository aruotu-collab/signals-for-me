"use client";

import { useState } from "react";
import { useFavourites } from "@/components/FavouritesProvider";
import { shiplyFavourite } from "@/lib/favourites";
import type { ShiplyJobCardData } from "@/components/shiply/ShiplyJobCard";

export function MarkWonButton({
  job,
  className = "",
}: {
  job: ShiplyJobCardData;
  className?: string;
}) {
  const { isFav, getJob, markWon } = useFavourites();
  const fav = shiplyFavourite(job);
  const saved = isFav(fav.key);
  const item = getJob(fav.key);
  const [open, setOpen] = useState(false);
  const [bid, setBid] = useState("");

  if (!saved) return null;
  if (item?.status === "won" || item?.status === "completed") {
    return (
      <span className={`chip bg-emerald-500/15 text-emerald-200 ${className}`}>
        {item.status === "completed" ? "Completed" : "Won"}
      </span>
    );
  }

  const submit = () => {
    const n = bid.trim() ? Number.parseFloat(bid) : undefined;
    if (bid.trim() && (!Number.isFinite(n!) || n! <= 0)) return;
    markWon(fav.key, n);
    setOpen(false);
    setBid("");
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className={`chip bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25 ${className}`}
      >
        I won this
      </button>
    );
  }

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <input
        type="number"
        min={1}
        step={1}
        placeholder="Your bid £"
        value={bid}
        onChange={(e) => setBid(e.target.value)}
        className="w-24 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white"
      />
      <button type="button" onClick={submit} className="chip bg-emerald-500/25 text-emerald-100">
        Confirm
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-slate-500">
        Cancel
      </button>
    </div>
  );
}
