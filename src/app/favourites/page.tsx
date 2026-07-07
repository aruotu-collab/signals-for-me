"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useFavourites } from "@/components/FavouritesProvider";
import type { FavouriteSource } from "@/lib/favourites";

type Filter = "all" | FavouriteSource;

export default function FavouritesPage() {
  const { favourites, remove, clear, ready, count, signedIn } = useFavourites();
  const [filter, setFilter] = useState<Filter>("all");
  const [service, setService] = useState<string>("all");

  const shiplyCount = favourites.filter((f) => f.source === "shiply").length;
  const ebayCount = favourites.filter((f) => f.source === "ebay").length;

  const bySource = filter === "all" ? favourites : favourites.filter((f) => f.source === filter);

  const services = useMemo(() => {
    const set = new Set(bySource.map((f) => f.service).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [bySource]);

  const filtered = service === "all" ? bySource : bySource.filter((f) => f.service === service);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="chip border border-white/10 bg-white/5 text-slate-300">Saved jobs</span>
          <h1 className="mt-2 text-2xl font-bold text-white">Your favourite jobs</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Shiply jobs and eBay collection-only items you&apos;ve starred. Open them when you&apos;re ready to bid.
          </p>
        </div>
        <Link href="/matrix" className="btn-ghost px-4 py-2 text-sm">
          Find more jobs
        </Link>
      </header>

      {ready && !signedIn && count > 0 && (
        <div className="card flex flex-wrap items-center justify-between gap-3 border border-brand-500/20 bg-brand-500/5 p-4 text-sm text-slate-300">
          <span>
            Saved on this device only.{" "}
            <Link href="/login" className="font-medium text-brand-300 underline">
              Sign in
            </Link>{" "}
            to keep your favourites across phone, tablet and laptop.
          </span>
        </div>
      )}

      {!ready ? (
        <div className="card p-8 text-center text-sm text-slate-400">Loading…</div>
      ) : count === 0 ? (
        <div className="card p-10 text-center">
          <div className="text-4xl">☆</div>
          <p className="mt-3 text-sm text-slate-400">
            No saved jobs yet. Tap the star on any job in the{" "}
            <Link href="/matrix" className="text-brand-300 underline">
              matrix
            </Link>
            ,{" "}
            <Link href="/planner" className="text-brand-300 underline">
              planner
            </Link>{" "}
            or{" "}
            <Link href="/opportunities" className="text-brand-300 underline">
              eBay opportunities
            </Link>{" "}
            to shortlist it here.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <SourceChip label={`All (${count})`} active={filter === "all"} onClick={() => { setFilter("all"); setService("all"); }} />
            {shiplyCount > 0 && (
              <SourceChip label={`Shiply (${shiplyCount})`} active={filter === "shiply"} onClick={() => { setFilter("shiply"); setService("all"); }} />
            )}
            {ebayCount > 0 && (
              <SourceChip label={`eBay (${ebayCount})`} active={filter === "ebay"} onClick={() => { setFilter("ebay"); setService("all"); }} />
            )}
            <button
              onClick={() => {
                if (confirm("Remove all saved jobs?")) clear();
              }}
              className="ml-auto text-xs text-slate-500 hover:text-red-300"
            >
              Clear all
            </button>
          </div>

          {services.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500">Category:</span>
              <button
                onClick={() => setService("all")}
                className={`chip ${service === "all" ? "bg-brand-500/20 text-brand-200" : "bg-white/5 text-slate-400 hover:text-white"}`}
              >
                All
              </button>
              {services.map((s) => (
                <button
                  key={s}
                  onClick={() => setService(s)}
                  className={`chip ${service === s ? "bg-brand-500/20 text-brand-200" : "bg-white/5 text-slate-400 hover:text-white"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <ul className="space-y-3">
            {filtered.map((f) => (
              <li key={f.key} className="relative">
                <a
                  href={f.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 pr-10 transition hover:border-brand-400/30"
                >
                  {f.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={f.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <div className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-white/5 text-slate-600">
                      📦
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 text-sm font-medium text-white">{f.title}</div>
                    {f.line1 && <div className="mt-1 text-xs text-slate-400">{f.line1}</div>}
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                      <span
                        className={`chip ${f.source === "ebay" ? "bg-amber-500/15 text-amber-200" : "bg-emerald-500/15 text-emerald-200"}`}
                      >
                        {f.source === "ebay" ? "eBay" : "Shiply"}
                      </span>
                      {f.service && <span className="chip bg-white/5 text-slate-300">{f.service}</span>}
                      {f.detail && <span className="chip bg-white/5 text-slate-300">{f.detail}</span>}
                      <span className="chip bg-brand-500/15 text-brand-200">
                        {f.source === "ebay" ? "Open on eBay →" : "Open on Shiply →"}
                      </span>
                    </div>
                  </div>
                </a>
                <button
                  onClick={() => remove(f.key)}
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

function SourceChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`chip ${active ? "bg-brand-500/20 text-brand-200" : "bg-white/5 text-slate-400 hover:text-white"}`}
    >
      {label}
    </button>
  );
}
