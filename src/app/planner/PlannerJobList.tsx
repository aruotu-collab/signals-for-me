"use client";

import { ShiplyJobCard } from "@/components/shiply/ShiplyJobCard";

type Job = {
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

export function PlannerJobList({
  jobs,
  legMiles,
  mode,
}: {
  jobs: Job[];
  legMiles: (number | null)[];
  mode: "route" | "miles";
}) {
  return (
    <ol className="mt-4 space-y-3">
      {jobs.map((j, i) => (
        <li key={j.shiplyKey}>
          <div className="relative">
            {mode === "route" && legMiles[i] != null && (
              <div className="mb-1 pl-1 text-[11px] font-medium text-brand-300">+{legMiles[i]} mi leg</div>
            )}
            <ShiplyJobCard job={j} index={i + 1} compactIntel />
          </div>
        </li>
      ))}
    </ol>
  );
}
