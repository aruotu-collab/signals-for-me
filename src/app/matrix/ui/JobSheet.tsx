"use client";

import { useEffect, useState } from "react";

export type SheetJob = {
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

export type SheetTarget = {
  service: string;
  pickupKey: string;
  jobKeys: string[];
} | null;

export function JobSheet({ target, onClose }: { target: SheetTarget; onClose: () => void }) {
  const [jobs, setJobs] = useState<SheetJob[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!target) return;
    let cancelled = false;
    setLoading(true);
    setJobs([]);
    fetch("/api/shiply/jobs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ keys: target.jobKeys }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setJobs(d.jobs ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [target]);

  if (!target) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <button aria-label="Close" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-t-2xl border border-white/10 bg-ink-900 sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-brand-300">📍 Pickup from {target.pickupKey}</div>
            <h2 className="text-lg font-bold text-white">{target.service}</h2>
            <p className="text-xs text-slate-400">{target.jobKeys.length} jobs · nearest drop-off first</p>
          </div>
          <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:bg-white/5 hover:text-white">
            Close
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-4">
          {loading && <p className="text-sm text-slate-500">Loading jobs…</p>}
          {!loading && jobs.length === 0 && <p className="text-sm text-slate-500">No jobs found.</p>}

          <ul className="space-y-3">
            {jobs.map((j) => (
              <li key={j.shiplyKey}>
                <a
                  href={j.shiplyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-brand-400/30"
                >
                  {j.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={j.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <div className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-white/5 text-slate-600">📦</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 text-sm font-medium text-white">{j.title}</div>
                    <div className="mt-1 text-xs text-slate-400">
                      {j.pickupTown} → {j.deliveryTown}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                      {j.miles != null && <span className="chip bg-white/5 text-slate-300">{j.miles} mi</span>}
                      {j.quotes != null && <span className="chip bg-white/5 text-slate-300">{j.quotes} quotes</span>}
                      <span className="chip bg-brand-500/15 text-brand-200">Open on Shiply →</span>
                    </div>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
