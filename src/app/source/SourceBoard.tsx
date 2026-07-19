"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import type { SourceOpportunity, SourceScanResult } from "@/lib/source/types";

const PROFIT_PRESETS = [5, 7, 10, 15] as const;

function bandTone(band: SourceOpportunity["band"]): string {
  if (band === "hot") return "bg-emerald-500/15 text-emerald-200";
  if (band === "good") return "bg-brand-500/15 text-brand-200";
  if (band === "watch") return "bg-amber-500/15 text-amber-200";
  return "bg-white/5 text-slate-400";
}

export function SourceBoard() {
  const [minProfit, setMinProfit] = useState(7);
  const [maxDaysToSell, setMaxDaysToSell] = useState(14);
  const [data, setData] = useState<SourceScanResult | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState<string | null>(null);

  const scan = useCallback(() => {
    setError("");
    startTransition(async () => {
      try {
        const params = new URLSearchParams({
          minProfit: String(minProfit),
          maxDaysToSell: String(maxDaysToSell),
          limit: "24",
        });
        const res = await fetch(`/api/source/opportunities?${params}`);
        const json = (await res.json()) as SourceScanResult & { error?: string };
        if (!res.ok || json.source === "error") {
          setError(json.error ?? "Scan failed");
          setData(json.source === "unconfigured" ? json : null);
          return;
        }
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Scan failed");
        setData(null);
      }
    });
  }, [minProfit, maxDaysToSell]);

  useEffect(() => {
    scan();
  }, [scan]);

  return (
    <div className="space-y-6">
      <div className="card space-y-4 p-5">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Minimum net profit
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {PROFIT_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setMinProfit(p)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  minProfit === p
                    ? "bg-brand-500/20 text-brand-200"
                    : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                £{p}+
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="text-sm text-slate-400">
            Estimated sale
            <select
              value={maxDaysToSell}
              onChange={(e) => setMaxDaysToSell(Number(e.target.value))}
              className="ml-2 rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-slate-200"
            >
              <option value={3}>Within 3 days</option>
              <option value={7}>Within 7 days</option>
              <option value={14}>Within 14 days</option>
              <option value={30}>Within 30 days</option>
            </select>
          </label>
          <button
            type="button"
            onClick={scan}
            disabled={pending}
            className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
          >
            {pending ? "Scanning CJ…" : "Scan again"}
          </button>
        </div>

        <p className="text-xs text-slate-500">
          CJ Dropshipping → match against live UK eBay Buy-it-now demand. Ranked by expected profit per day, not
          headline profit. Active asks are risk-adjusted for competition. Always verify sold comps before listing.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-200">{error}</div>
      )}

      {data?.source === "unconfigured" && (
        <div className="card space-y-2 p-6 text-sm text-slate-300">
          <p>
            Add <code className="text-slate-200">CJ_API_KEY</code> in Vercel / <code className="text-slate-200">.env</code>{" "}
            to enable List Today.
          </p>
          <p className="text-xs text-slate-500">
            Create an API Key in your CJ Dropshipping account (API tab → Add API → Type: API Key), then paste it into
            env.
          </p>
        </div>
      )}

      {data && data.source === "live" && (
        <div className="text-sm text-slate-400">
          {data.opportunities.length === 0
            ? "No listable opportunities in this window"
            : `${data.opportunities.length} opportunities · scanned ${data.scanned} CJ products`}
          <span className="ml-2 text-xs uppercase tracking-wide text-slate-500">CJ · eBay GB</span>
        </div>
      )}

      {pending && !data && (
        <div className="card p-8 text-center text-sm text-slate-400">
          Scanning CJ trending products and matching eBay demand…
        </div>
      )}

      <div className="space-y-3">
        {data?.opportunities.map((opp) => (
          <article key={opp.id} className="card overflow-hidden">
            <div className="flex gap-4 p-4">
              {opp.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={opp.imageUrl}
                  alt=""
                  className="h-20 w-20 shrink-0 rounded-lg object-cover bg-white/5"
                />
              ) : (
                <div className="grid h-20 w-20 shrink-0 place-items-center rounded-lg bg-white/5 text-xs text-slate-500">
                  No image
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${bandTone(opp.band)}`}>
                    Score {opp.opportunityScore}/100
                  </span>
                  <span className="rounded bg-white/5 px-2 py-0.5 text-xs text-slate-300">CJ</span>
                  {opp.categoryName && (
                    <span className="rounded bg-white/5 px-2 py-0.5 text-xs text-slate-400">{opp.categoryName}</span>
                  )}
                  <span className="text-xs text-slate-500">Competition {opp.competitionLabel}</span>
                </div>
                <h2 className="mt-1 line-clamp-2 font-medium text-white">{opp.title}</h2>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                  <Stat label="CJ cost" value={`£${opp.supplierCostGbp.toLocaleString("en-GB")}`} />
                  <Stat label="eBay ask*" value={`£${opp.ebayMarketGbp.toLocaleString("en-GB")}`} />
                  <Stat label="Net profit" value={`£${opp.netProfitGbp.toLocaleString("en-GB")}`} accent />
                  <Stat label="Profit / day" value={`£${opp.profitPerDay.toLocaleString("en-GB")}`} accent />
                  <Stat label="Est. sell" value={`~${opp.estimatedDaysToSell}d`} />
                  <Stat label="Active BINs" value={String(opp.ebayActiveCount)} />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-white/5 px-4 py-3">
              {opp.supplierUrl && (
                <a href={opp.supplierUrl} target="_blank" rel="noreferrer" className="btn-primary px-4 py-2 text-sm">
                  Open on CJ
                </a>
              )}
              <a
                href={opp.ebaySearchUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg bg-white/5 px-3 py-2 text-sm text-slate-300 hover:bg-white/10"
              >
                Check eBay demand
              </a>
              <button
                type="button"
                onClick={() => setExpanded(expanded === opp.id ? null : opp.id)}
                className="ml-auto text-xs text-brand-300 hover:underline"
              >
                {expanded === opp.id ? "Hide details" : "Why this score"}
              </button>
            </div>
            {expanded === opp.id && (
              <ul className="space-y-1.5 border-t border-white/5 bg-white/[0.02] px-4 py-3 text-sm text-slate-300">
                {opp.why.map((line) => (
                  <li key={line} className="flex gap-2">
                    <span className="text-brand-400">·</span>
                    <span>{line}</span>
                  </li>
                ))}
                <li className="pt-1 text-xs text-slate-500">
                  *eBay ask is risk-adjusted from active Buy-it-now listings — not confirmed sold prices.
                </li>
              </ul>
            )}
          </article>
        ))}
      </div>
    </div>
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
