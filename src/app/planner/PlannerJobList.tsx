"use client";

import { useMemo } from "react";
import { ShiplyJobCard } from "@/components/shiply/ShiplyJobCard";
import { useDriverSettings } from "@/lib/shiply/driverSettings";
import { jobPassesWorthItFilter } from "@/lib/shiply/intelligence";

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
  const { settings } = useDriverSettings();

  const visible = useMemo(
    () =>
      jobs
        .map((j, i) => ({ job: j, leg: legMiles[i] ?? null, originalIndex: i }))
        .filter(({ job }) => jobPassesWorthItFilter(job, settings)),
    [jobs, legMiles, settings],
  );

  const hiddenCount = jobs.length - visible.length;

  if (jobs.length === 0) return null;

  return (
    <>
      {hiddenCount > 0 && (
        <p className="mt-2 text-xs text-slate-500">
          {hiddenCount} {hiddenCount === 1 ? "job" : "jobs"} hidden — below your £{settings.minHourlyRate}/hour minimum.
        </p>
      )}
      {visible.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">
          No jobs in this hub meet your £{settings.minHourlyRate}/hour minimum. Adjust your filter in{" "}
          <span className="text-brand-300">Your van &amp; rates</span> above.
        </p>
      ) : (
        <ol className="mt-4 space-y-3">
          {visible.map(({ job, leg }, i) => (
            <li key={job.shiplyKey}>
              <div className="relative">
                {mode === "route" && leg != null && (
                  <div className="mb-1 pl-1 text-[11px] font-medium text-brand-300">+{leg} mi leg</div>
                )}
                <ShiplyJobCard job={job} index={i + 1} compactIntel />
              </div>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
