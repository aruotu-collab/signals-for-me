"use client";

import Link from "next/link";
import { useFavourites } from "@/components/FavouritesProvider";

export function SavedNavLink() {
  const { activeCount, ready } = useFavourites();
  return (
    <Link
      href="/favourites"
      className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-2 text-slate-300 hover:bg-white/5 hover:text-white sm:px-3"
    >
      My jobs
      {ready && activeCount > 0 && (
        <span className="grid min-w-[18px] place-items-center rounded-full bg-amber-500/20 px-1 text-[11px] font-semibold text-amber-200">
          {activeCount}
        </span>
      )}
    </Link>
  );
}
