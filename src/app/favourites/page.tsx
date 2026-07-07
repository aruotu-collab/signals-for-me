"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { clearFavourites, useFavourites } from "@/lib/favourites";

export default function FavouritesPage() {
  const { favourites, remove, ready, count } = useFavourites();
  const [service, setService] = useState<string>("all");

  const services = useMemo(() => {
    const set = new Set(favourites.map((j) => j.service).filter(Boolean));
    return Array.from(set).sort();
  }, [favourites]);

  const filtered = service === "all" ? favourites : favourites.filter((j) => j.service === service);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="chip border border-white/10 bg-white/5 text-slate-300">Saved jobs</span>
          <h1 className="mt-2 text-2xl font-bold text-white">Your favourite jobs</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Jobs you&apos;ve starred from the matrix and planner. Open them on Shiply when you&apos;re ready to bid.
            Saved on this device — no account needed.
          </p>
        </div>
        <Link href="/matrix" className="btn-ghost px-4 py-2 text-sm">
          Find more jobs
        </Link>
      </header>

      {!ready ? (
        <div className="card p-8 text-center text-sm text-slate-400">Loading…</div>
      ) : count === 0 ? (
        <div className="card p-10 text-center">
          <div className="text-4xl">☆</div>
          <p className="mt-3 text-sm text-slate-400">
            No saved jobs yet. Tap the star on any job in the{" "}
            <Link href="/matrix" className="text-brand-300 underline">
              matrix
            </Link>{" "}
            or{" "}
            <Link href="/planner" className="text-brand-300 underline">
              planner
            </Link>{" "}
            to shortlist it here.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setService("all")}
              className={`chip ${service === "all" ? "bg-brand-500/20 text-brand-200" : "bg-white/5 text-slate-400 hover:text-white"}`}
            >
              All ({favourites.length})
            </button>
            {services.map((s) => (
              <button
                key={s}
                onClick={() => setService(s)}
                className={`chip ${service === s ? "bg-brand-500/20 text-brand-200" : "bg-white/5 text-slate-400 hover:text-white"}`}
              >
                {s} ({favourites.filter((j) => j.service === s).length})
              </button>
            ))}
            <button
              onClick={() => {
                if (confirm("Remove all saved jobs?")) clearFavourites();
              }}
              className="ml-auto text-xs text-slate-500 hover:text-red-300"
            >
              Clear all
            </button>
          </div>

          <ul className="space-y-3">
            {filtered.map((j) => (
              <li key={j.shiplyKey} className="relative">
                <a
                  href={j.shiplyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 pr-10 transition hover:border-brand-400/30"
                >
                  {j.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={j.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <div className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-white/5 text-slate-600">
                      📦
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 text-sm font-medium text-white">{j.title}</div>
                    <div className="mt-1 text-xs text-slate-400">
                      {j.pickupTown} → {j.deliveryTown}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                      {j.service && <span className="chip bg-white/5 text-slate-300">{j.service}</span>}
                      {j.miles != null && <span className="chip bg-white/5 text-slate-300">{j.miles} mi</span>}
                      {j.quotes != null && <span className="chip bg-white/5 text-slate-300">{j.quotes} quotes</span>}
                      <span className="chip bg-brand-500/15 text-brand-200">Open on Shiply →</span>
                    </div>
                  </div>
                </a>
                <button
                  onClick={() => remove(j.shiplyKey)}
                  aria-label="Remove from favourites"
                  title="Remove"
                  className="absolute right-2 top-2 rounded-lg px-2 py-1 text-amber-300 hover:bg-white/5 hover:text-amber-200"
                >
                  ★
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
