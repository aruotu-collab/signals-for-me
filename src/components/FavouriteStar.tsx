"use client";

import { useFavourites, type FavouriteJob } from "@/lib/favourites";

type Props = {
  job: Omit<FavouriteJob, "savedAt">;
  className?: string;
  /** Show a text label next to the star. */
  withLabel?: boolean;
};

export function FavouriteStar({ job, className = "", withLabel = false }: Props) {
  const { isFav, toggle, ready } = useFavourites();
  const active = ready && isFav(job.shiplyKey);

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? "Remove from favourites" : "Save to favourites"}
      title={active ? "Saved — tap to remove" : "Save this job"}
      onClick={(e) => {
        // Job cards are wrapped in links; don't navigate when starring.
        e.preventDefault();
        e.stopPropagation();
        toggle(job);
      }}
      className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-sm transition ${
        active
          ? "text-amber-300 hover:text-amber-200"
          : "text-slate-500 hover:bg-white/5 hover:text-amber-300"
      } ${className}`}
    >
      <span className="text-base leading-none">{active ? "★" : "☆"}</span>
      {withLabel && <span className="text-xs">{active ? "Saved" : "Save"}</span>}
    </button>
  );
}
