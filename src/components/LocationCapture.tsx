"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { saveConsumerLocation } from "@/app/profile/actions";
import { listCountries, listLocalities, listRegions } from "@/app/profile/location-actions";
import { formatAreaDisplay, regionStepLabel, type UserLocation } from "@/lib/location";

type Country = { code: string; name: string };
type Region = { code: string; name: string };

export function LocationCapture({
  compact = false,
  initial,
  onSaved,
  embedded = false,
  onLocationChange,
}: {
  compact?: boolean;
  initial?: Partial<UserLocation> | null;
  onSaved?: () => void;
  /** When true, location is passed to parent — no profile save or inner submit. */
  embedded?: boolean;
  onLocationChange?: (loc: UserLocation | null) => void;
}) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [countryCode, setCountryCode] = useState("");
  const [countryName, setCountryName] = useState(initial?.locationCountry ?? "");
  const [regionCode, setRegionCode] = useState("");
  const [regionName, setRegionName] = useState(initial?.locationRegion ?? "");
  const [selected, setSelected] = useState<UserLocation | null>(
    initial?.locationCountry && initial.locationRegion && initial.locationArea
      ? {
          locationCountry: initial.locationCountry,
          locationRegion: initial.locationRegion,
          locationCity: initial.locationCity ?? initial.locationArea,
          locationArea: initial.locationArea,
        }
      : null,
  );
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<{ label: string; location: UserLocation }[]>([]);
  const [quickPicks, setQuickPicks] = useState<{ name: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    listCountries().then(setCountries);
  }, []);

  useEffect(() => {
    if (!countryCode) {
      setRegions([]);
      return;
    }
    listRegions(countryCode).then(setRegions);
  }, [countryCode]);

  useEffect(() => {
    if (!countryCode || !regionCode) {
      setQuickPicks([]);
      return;
    }
    listLocalities(countryCode, regionCode).then(setQuickPicks);
  }, [countryCode, regionCode]);

  // Match initial country name to code once countries load
  useEffect(() => {
    if (!initial?.locationCountry || countryCode || countries.length === 0) return;
    const match = countries.find(
      (c) => c.name.toLowerCase() === initial.locationCountry!.toLowerCase(),
    );
    if (match) {
      setCountryCode(match.code);
      setCountryName(match.name);
    }
  }, [countries, initial, countryCode]);

  useEffect(() => {
    if (!initial?.locationRegion || regionCode || regions.length === 0) return;
    const match = regions.find(
      (r) => r.name.toLowerCase() === initial.locationRegion!.toLowerCase(),
    );
    if (match) setRegionCode(match.code);
  }, [regions, initial, regionCode]);

  const runSearch = useCallback(
    async (q: string) => {
      if (!countryCode || q.trim().length < 2) {
        setSuggestions([]);
        return;
      }
      setSearching(true);
      try {
        const params = new URLSearchParams({
          q: q.trim(),
          country: countryCode,
        });
        if (regionName) params.set("region", regionName);
        const res = await fetch(`/api/location/search?${params}`);
        const data = (await res.json()) as {
          results: { label: string; location: UserLocation }[];
        };
        setSuggestions(data.results ?? []);
      } finally {
        setSearching(false);
      }
    },
    [countryCode, regionName],
  );

  useEffect(() => {
    const t = setTimeout(() => runSearch(query), 400);
    return () => clearTimeout(t);
  }, [query, runSearch]);

  function onCountryChange(code: string) {
    const c = countries.find((x) => x.code === code);
    setCountryCode(code);
    setCountryName(c?.name ?? "");
    setRegionCode("");
    setRegionName("");
    setSelected(null);
    setQuery("");
    setSuggestions([]);
  }

  function onRegionChange(code: string) {
    const r = regions.find((x) => x.code === code);
    setRegionCode(code);
    setRegionName(r?.name ?? "");
    setSelected(null);
    setQuery("");
    setSuggestions([]);
  }

  function pickLocation(loc: UserLocation) {
    setSelected(loc);
    setCountryName(loc.locationCountry);
    setRegionName(loc.locationRegion);
    setQuery(formatAreaDisplay(loc));
    setSuggestions([]);
    if (embedded) onLocationChange?.(loc);
  }

  function pickQuickCity(name: string) {
    if (!countryName || !regionName) return;
    pickLocation({
      locationCountry: countryName,
      locationRegion: regionName,
      locationCity: name,
      locationArea: name,
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const loc =
      selected ??
      (countryName && regionName && query.trim()
        ? {
            locationCountry: countryName,
            locationRegion: regionName,
            locationCity: query.trim(),
            locationArea: query.trim(),
          }
        : null);

    if (!loc) {
      setError("Select your country and region, then search for your town or area.");
      return;
    }

    if (embedded) {
      onLocationChange?.(loc);
      return;
    }

    startTransition(async () => {
      const result = await saveConsumerLocation(loc);
      if (result.error) {
        setError(result.error);
        return;
      }
      onSaved?.();
    });
  }

  const selectCls =
    "w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white [&>option]:bg-ink-900";

  const inner = (
    <>
      <div className="text-sm font-semibold text-white">
        {embedded
          ? "Where do you need help?"
          : compact
            ? "Add your location to vote"
            : "Where are you based?"}
      </div>
      <p className="mt-1 text-xs text-slate-400">
        Country → region → town/area (e.g. Nigeria → Lagos State → Ikeja, or UK → England →
        Catford).
        {!embedded && " Helps businesses see where demand is."}
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-1">
          <span className="text-xs text-slate-400">Country</span>
          <select
            required={!embedded}
            value={countryCode}
            onChange={(e) => onCountryChange(e.target.value)}
            className={`mt-1 ${selectCls}`}
          >
            <option value="">Select country…</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block sm:col-span-1">
          <span className="text-xs text-slate-400">
            {countryCode ? regionStepLabel(countryCode) : "State / region"}
          </span>
          <select
            required={!embedded}
            value={regionCode}
            disabled={!countryCode}
            onChange={(e) => onRegionChange(e.target.value)}
            className={`mt-1 ${selectCls} disabled:opacity-50`}
          >
            <option value="">Select…</option>
            {regions.map((r) => (
              <option key={r.code} value={r.code}>
                {r.name}
              </option>
            ))}
          </select>
        </label>

        <div className="relative sm:col-span-2">
          <label className="block">
            <span className="text-xs text-slate-400">Town / area</span>
            <input
              type="text"
              value={query}
              disabled={!regionCode}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected(null);
                if (embedded) onLocationChange?.(null);
              }}
              placeholder="Search e.g. Ikeja, Catford, Austin…"
              className="mt-1 w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 disabled:opacity-50"
            />
          </label>
          {searching && <p className="mt-1 text-xs text-slate-500">Searching…</p>}
          {suggestions.length > 0 && !selected && (
            <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-white/10 bg-ink-900 shadow-lg">
              {suggestions.map((s) => (
                <li key={s.label}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/10"
                    onClick={() => pickLocation(s.location)}
                  >
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {quickPicks.length > 0 && regionCode && !selected && query.length < 2 && (
        <div className="mt-2">
          <div className="text-xs text-slate-500">Popular in this region</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {quickPicks.slice(0, 12).map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => pickQuickCity(c.name)}
                className="chip bg-white/5 text-slate-300 hover:bg-white/10"
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {selected && (
        <p className="mt-2 text-xs text-brand-200">
          Selected: {selected.locationCountry} → {selected.locationRegion} →{" "}
          {formatAreaDisplay(selected)}
        </p>
      )}

      {!embedded && (
        <button
          type="submit"
          disabled={pending || !countryCode || !regionCode}
          className="btn-primary mt-3 px-4 py-2 text-sm disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save location"}
        </button>
      )}

      {error && <p className="mt-2 text-xs text-signal-distress">{error}</p>}
    </>
  );

  if (embedded) {
    return (
      <div className={`rounded-xl border border-white/10 bg-white/[0.03] ${compact ? "p-4" : "p-5"}`}>
        {inner}
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className={`rounded-xl border border-brand-400/25 bg-brand-500/10 ${compact ? "p-4" : "p-5"}`}
    >
      {inner}
    </form>
  );
}
