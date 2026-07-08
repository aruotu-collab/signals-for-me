"use client";

import Link from "next/link";
import { FavouriteStar } from "@/components/FavouriteStar";
import { MarkWonButton } from "@/components/my-jobs/MarkWonButton";
import { JobIntelligence } from "@/components/shiply/JobIntelligence";
import { shiplyFavourite, type FavouriteInput } from "@/lib/favourites";

export type ShiplyJobCardData = {
  shiplyKey: string;
  shiplyUrl: string;
  title: string;
  imageUrl: string | null;
  pickupTown: string;
  pickupKey: string;
  deliveryTown: string;
  miles: number | null;
  quotes: number | null;
  service: string;
};

export function ShiplyJobCard({
  job,
  index,
  showIntel = true,
  compactIntel = false,
}: {
  job: ShiplyJobCardData;
  index?: number;
  showIntel?: boolean;
  compactIntel?: boolean;
}) {
  const fav: FavouriteInput = shiplyFavourite(job);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex gap-3">
        {index != null && (
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-500/15 text-sm font-bold text-brand-200">
            {index}
          </div>
        )}
        {job.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={job.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
        ) : (
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-white/5 text-slate-600">📦</div>
        )}
        <div className="min-w-0 flex-1">
          <div className="line-clamp-2 text-sm font-medium text-white">{job.title}</div>
          <div className="mt-1 text-xs text-slate-400">
            {job.pickupTown || job.pickupKey} → {job.deliveryTown}
          </div>
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
            {job.miles != null && <span className="chip bg-white/5 text-slate-300">{job.miles} mi</span>}
            {job.quotes != null && <span className="chip bg-white/5 text-slate-300">{job.quotes} quotes</span>}
            <span className="chip bg-white/5 text-slate-300">{job.service}</span>
          </div>
        </div>
        <FavouriteStar item={fav} />
      </div>

      {showIntel && <JobIntelligence job={job} compact={compactIntel} />}

      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        <MarkWonButton job={job} />
        <Link
          href={job.shiplyUrl}
          target="_blank"
          rel="noreferrer"
          className="chip bg-brand-500/15 text-brand-200 hover:bg-brand-500/25"
        >
          Open on listing →
        </Link>
      </div>
    </div>
  );
}
