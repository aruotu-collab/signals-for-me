"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ServiceRequestForm } from "@/components/ServiceRequestForm";
import { EMERGENCY_QUICK_PICKS } from "@/lib/serviceRequest";

type SearchHit = {
  id: string;
  slug: string;
  h1: string;
  serviceName: string;
};

export function NeedHubRequest({
  initialService = "",
  initialCampaign,
}: {
  initialService?: string;
  initialCampaign?: SearchHit | null;
}) {
  const [query, setQuery] = useState(initialService);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [selected, setSelected] = useState<SearchHit | null>(initialCampaign ?? null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (initialCampaign) {
      setSelected(initialCampaign);
      setQuery(initialCampaign.serviceName);
    }
  }, [initialCampaign]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setHits([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/need/search?q=${encodeURIComponent(query.trim())}`);
        const data = (await res.json()) as { results: SearchHit[] };
        setHits(data.results ?? []);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  function pickHit(hit: SearchHit) {
    setSelected(hit);
    setQuery(hit.serviceName);
    setHits([]);
  }

  function pickQuick(label: string, searchQuery: string) {
    setQuery(searchQuery);
    setSelected(null);
  }

  const serviceName = selected?.serviceName ?? query.trim();

  return (
    <div className="space-y-6">
      <div className="relative">
        <label className="block">
          <span className="text-sm font-medium text-slate-300">What do you need help with?</span>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(null);
            }}
            placeholder="Search e.g. flat tire, plumber, locked out…"
            className="mt-1 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-white placeholder:text-slate-500"
          />
        </label>
        {searching && <p className="mt-1 text-xs text-slate-500">Searching…</p>}
        {hits.length > 0 && !selected && (
          <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-white/10 bg-ink-900 shadow-xl">
            {hits.map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  onClick={() => pickHit(h)}
                  className="w-full px-4 py-3 text-left hover:bg-white/5"
                >
                  <div className="font-medium text-white">{h.serviceName}</div>
                  <div className="text-xs text-slate-500">{h.h1}</div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <div className="text-xs text-slate-500">Common emergencies</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {EMERGENCY_QUICK_PICKS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => pickQuick(p.label, p.query)}
              className="chip bg-white/5 text-slate-300 hover:bg-brand-500/15 hover:text-brand-200"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <p className="text-sm text-brand-200">
          Selected: {selected.serviceName}{" "}
          <Link href={`/need/${selected.slug}`} className="text-slate-400 underline hover:text-white">
            View page
          </Link>
        </p>
      )}

      {serviceName.length >= 3 && (
        <ServiceRequestForm
          key={selected?.id ?? serviceName}
          serviceName={serviceName}
          slug={selected?.slug}
          intentCampaignId={selected?.id}
          serviceEditable={!selected}
          headline="Request help now"
          subline="Fill in your location and phone — we'll connect you to a local provider."
          compact
        />
      )}
    </div>
  );
}
