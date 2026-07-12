"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { FlipOpportunity } from "@/lib/flip/types";
import { FLIP_CATEGORIES } from "@/lib/flip/types";

type ApiResult = {
  opportunities: FlipOpportunity[];
  scanned: number;
  source: string;
  categories: string[];
  error?: string;
};

const PROFIT_PRESETS = [75, 100, 150, 300] as const;

function parseCategory(raw: string | null): string {
  if (!raw) return "Watches";
  if (raw === "all") return "all";
  if ((FLIP_CATEGORIES as readonly string[]).includes(raw)) return raw;
  return "Watches";
}

export function FlipBoard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [minProfit, setMinProfit] = useState(() => {
    const n = Number(searchParams.get("minProfit") ?? "75");
    return Number.isFinite(n) && n >= 0 ? n : 75;
  });
  const [category, setCategory] = useState(() => parseCategory(searchParams.get("category")));
  const [maxEndsInHours, setMaxEndsInHours] = useState(() => {
    const n = Number(searchParams.get("maxEndsInHours") ?? "48");
    return Number.isFinite(n) && n > 0 ? n : 48;
  });
  const [data, setData] = useState<ApiResult | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState<string | null>(null);

  // Sync when nav links change the query string.
  useEffect(() => {
    setCategory(parseCategory(searchParams.get("category")));
    const profit = Number(searchParams.get("minProfit") ?? "");
    if (Number.isFinite(profit) && profit >= 0) setMinProfit(profit);
  }, [searchParams]);

  const syncUrl = useCallback(
    (next: { minProfit?: number; category?: string; maxEndsInHours?: number }) => {
      const params = new URLSearchParams();
      const cat = next.category ?? category;
      const profit = next.minProfit ?? minProfit;
      const hours = next.maxEndsInHours ?? maxEndsInHours;
      if (cat !== "Watches") params.set("category", cat);
      if (profit !== 75) params.set("minProfit", String(profit));
      if (hours !== 48) params.set("maxEndsInHours", String(hours));
      const qs = params.toString();
      router.replace(qs ? `/flip?${qs}` : "/flip", { scroll: false });
    },
    [category, minProfit, maxEndsInHours, router],
  );

  const scan = useCallback(() => {
    setError("");
    startTransition(async () => {
      try {
        const params = new URLSearchParams({
          minProfit: String(minProfit),
          category,
          maxEndsInHours: String(maxEndsInHours),
        });
        const res = await fetch(`/api/flip/opportunities?${params}`);
        const json = (await res.json()) as ApiResult;
        if (!res.ok) {
          setError(json.error ?? "Scan failed");
          setData(null);
          return;
        }
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Scan failed");
        setData(null);
      }
    });
  }, [minProfit, category, maxEndsInHours]);

  useEffect(() => {
    scan();
  }, [scan]);

  return (
    <div className="space-y-6">
      <div className="card space-y-4 p-5">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">I want to make at least</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {PROFIT_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setMinProfit(p);
                  syncUrl({ minProfit: p });
                }}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  minProfit === p
                    ? "bg-brand-500/20 text-brand-200"
                    : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                £{p}+
              </button>
            ))}
            <label className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm text-slate-300">
              Custom
              <input
                type="number"
                min={0}
                step={25}
                value={minProfit}
                onChange={(e) => {
                  const v = Math.max(0, Number(e.target.value) || 0);
                  setMinProfit(v);
                }}
                onBlur={() => syncUrl({ minProfit })}
                className="w-20 rounded border border-white/10 bg-ink-900 px-2 py-1 text-white"
              />
            </label>
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="text-sm text-slate-400">
            Category
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                syncUrl({ category: e.target.value });
              }}
              className="ml-2 rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-slate-200"
            >
              <option value="Watches">Watches</option>
              <option value="Phones">Phones</option>
              <option value="Laptops">Laptops</option>
              <option value="all">All seed categories</option>
            </select>
          </label>
          <label className="text-sm text-slate-400">
            Ending within
            <select
              value={maxEndsInHours}
              onChange={(e) => {
                const hours = Number(e.target.value);
                setMaxEndsInHours(hours);
                syncUrl({ maxEndsInHours: hours });
              }}
              className="ml-2 rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-slate-200"
            >
              <option value={3}>3 hours</option>
              <option value={6}>6 hours</option>
              <option value={12}>12 hours</option>
              <option value={24}>24 hours</option>
              <option value={48}>48 hours</option>
            </select>
          </label>
          <button type="button" onClick={scan} disabled={pending} className="btn-primary px-4 py-2 text-sm disabled:opacity-50">
            {pending ? "Scanning…" : "Scan again"}
          </button>
        </div>

        <p className="text-xs text-slate-500">
          Scans UK eBay auctions ending soon in {FLIP_CATEGORIES.join(", ")}. Market values use brand heuristics plus
          live Buy-it-now comps where available — always verify sold prices before bidding.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-200">{error}</div>
      )}

      {data?.source === "unconfigured" && (
        <div className="card p-6 text-sm text-slate-300">
          eBay API credentials are not configured. Add <code className="text-slate-200">EBAY_CLIENT_ID</code> and{" "}
          <code className="text-slate-200">EBAY_CLIENT_SECRET</code> to enable live flip scans.
        </div>
      )}

      {data && data.source !== "unconfigured" && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-400">
          <span>
            {data.opportunities.length} opportunity{data.opportunities.length === 1 ? "" : "ies"} · scanned{" "}
            {data.scanned} auctions
          </span>
          <span className="text-xs uppercase tracking-wide text-slate-500">{data.source}</span>
        </div>
      )}

      {pending && !data && (
        <div className="card p-8 text-center text-sm text-slate-400">Scanning ending-soon auctions…</div>
      )}

      {data && data.opportunities.length === 0 && data.source === "live" && !pending && (
        <div className="card p-8 text-center text-sm text-slate-400">
          No auctions currently clear £{minProfit}+ estimated net profit in this window. Try a lower target or wider
          time range.
        </div>
      )}

      <div className="space-y-3">
        {data?.opportunities.map((opp) => (
          <OpportunityCard
            key={opp.id}
            opp={opp}
            expanded={expanded === opp.id}
            onToggle={() => setExpanded(expanded === opp.id ? null : opp.id)}
          />
        ))}
      </div>
    </div>
  );
}

function OpportunityCard({
  opp,
  expanded,
  onToggle,
}: {
  opp: FlipOpportunity;
  expanded: boolean;
  onToggle: () => void;
}) {
  const endsLabel =
    opp.endsInMinutes == null
      ? "—"
      : opp.endsInMinutes < 0
        ? "Ended"
        : opp.endsInMinutes < 60
          ? `${opp.endsInMinutes}m`
          : `${Math.round(opp.endsInMinutes / 60)}h`;

  return (
    <article className="card overflow-hidden">
      <div className="flex gap-4 p-4">
        {opp.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={opp.imageUrl} alt="" className="h-20 w-20 shrink-0 rounded-lg object-cover bg-white/5" />
        ) : (
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-lg bg-white/5 text-xs text-slate-500">
            No image
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-white/5 px-2 py-0.5 text-xs text-slate-300">{opp.category}</span>
            {opp.brand && <span className="rounded bg-brand-500/15 px-2 py-0.5 text-xs text-brand-200">{opp.brand}</span>}
            <span className="rounded bg-white/5 px-2 py-0.5 text-xs text-slate-400">
              {opp.marketSource === "comps" ? `${opp.compCount} comps` : "heuristic"}
            </span>
            <span className="text-xs text-slate-500">Ends {endsLabel}</span>
          </div>
          <h2 className="mt-1 line-clamp-2 font-medium text-white">{opp.title}</h2>
          {opp.location && <p className="mt-0.5 text-xs text-slate-500">{opp.location}</p>}

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <Stat label="Buy now" value={`£${opp.currentPrice.toLocaleString("en-GB")}`} />
            <Stat label="Market" value={`£${opp.marketValue.toLocaleString("en-GB")}`} />
            <Stat label="Net profit" value={`£${opp.netProfit.toLocaleString("en-GB")}`} accent />
            <Stat label="ROI" value={`${opp.roiPct}%`} />
            <Stat label="Confidence" value={`${opp.confidence}%`} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-white/5 px-4 py-3">
        <a
          href={opp.ebayUrl}
          target="_blank"
          rel="noreferrer"
          className="btn-primary px-4 py-2 text-sm"
        >
          Open on eBay
        </a>
        <span className="text-xs text-slate-400">
          Max bid for target ≈ <span className="text-slate-200">£{opp.maxBid.toLocaleString("en-GB")}</span>
        </span>
        <button type="button" onClick={onToggle} className="ml-auto text-xs text-brand-300 hover:underline">
          {expanded ? "Hide why" : "Why this opportunity?"}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-white/5 bg-white/[0.02] px-4 py-3">
          <ul className="space-y-1.5 text-sm text-slate-300">
            {opp.why.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="text-brand-400">·</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          {opp.riskFlags.length > 0 && (
            <p className="mt-2 text-xs text-amber-300">Risk flags: {opp.riskFlags.join(", ")}</p>
          )}
          <p className="mt-2 text-xs text-slate-500">
            Fees estimate includes ~{Math.round(0.129 * 100)}% selling fees + postage defaults. Confirm sold comps
            and condition before you bid.
          </p>
        </div>
      )}
    </article>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg bg-white/5 px-2.5 py-2">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`text-sm font-semibold ${accent ? "text-emerald-300" : "text-white"}`}>{value}</div>
    </div>
  );
}
