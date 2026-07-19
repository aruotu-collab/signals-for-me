"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { DealScoreBand, FlipOpportunity } from "@/lib/flip/types";
import { FLIP_CATEGORIES } from "@/lib/flip/types";
import type { CapitalPlan } from "@/lib/flip/plan";
import { rememberScanIds } from "@/lib/flip/desk";
import { useFlipDesk } from "@/components/FlipDeskProvider";

type Mode = "scan" | "budget" | "monthly";

type ApiResult = {
  opportunities: FlipOpportunity[];
  scanned: number;
  source: string;
  categories: string[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  skippedRisky?: number;
  skippedIlliquid?: number;
  plan?: CapitalPlan | null;
  error?: string;
};

const PROFIT_PRESETS = [75, 100, 150, 300] as const;
const PAGE_SIZE = 10;

function parseCategory(raw: string | null): string {
  if (!raw) return "Watches";
  if (raw === "all") return "all";
  if ((FLIP_CATEGORIES as readonly string[]).includes(raw)) return raw;
  return "Watches";
}

function parseMode(raw: string | null): Mode {
  if (raw === "budget" || raw === "monthly") return raw;
  return "scan";
}

export function FlipBoard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(() => parseMode(searchParams.get("mode")));
  const [minProfit, setMinProfit] = useState(() => {
    const n = Number(searchParams.get("minProfit") ?? "75");
    return Number.isFinite(n) && n >= 0 ? n : 75;
  });
  const [category, setCategory] = useState(() => parseCategory(searchParams.get("category")));
  const [maxEndsInHours, setMaxEndsInHours] = useState(() => {
    const n = Number(searchParams.get("maxEndsInHours") ?? "48");
    return Number.isFinite(n) && n > 0 ? n : 48;
  });
  const [maxDaysToSell, setMaxDaysToSell] = useState(() => {
    const n = Number(searchParams.get("maxDaysToSell") ?? "0");
    return Number.isFinite(n) && n > 0 ? n : 0;
  });
  const [maxBudget, setMaxBudget] = useState(() => {
    const n = Number(searchParams.get("maxBudget") ?? "500");
    return Number.isFinite(n) && n > 0 ? n : 500;
  });
  const [monthlyGoal, setMonthlyGoal] = useState(() => {
    const n = Number(searchParams.get("monthlyGoal") ?? "2000");
    return Number.isFinite(n) && n > 0 ? n : 2000;
  });
  const [startingCapital, setStartingCapital] = useState(() => {
    const n = Number(searchParams.get("startingCapital") ?? "300");
    return Number.isFinite(n) && n > 0 ? n : 300;
  });
  const [page, setPage] = useState(() => {
    const n = Number(searchParams.get("page") ?? "1");
    return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
  });
  const [data, setData] = useState<ApiResult | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [freshIds, setFreshIds] = useState<Set<string>>(() => new Set());
  const { isWatching, watch, unwatch, activeCount } = useFlipDesk();

  useEffect(() => {
    setMode(parseMode(searchParams.get("mode")));
    setCategory(parseCategory(searchParams.get("category")));
    const profit = Number(searchParams.get("minProfit") ?? "");
    if (Number.isFinite(profit) && profit >= 0) setMinProfit(profit);
    const p = Number(searchParams.get("page") ?? "");
    if (Number.isFinite(p) && p >= 1) setPage(Math.floor(p));
    const budget = Number(searchParams.get("maxBudget") ?? "");
    if (Number.isFinite(budget) && budget > 0) setMaxBudget(budget);
    const goal = Number(searchParams.get("monthlyGoal") ?? "");
    if (Number.isFinite(goal) && goal > 0) setMonthlyGoal(goal);
    const capital = Number(searchParams.get("startingCapital") ?? "");
    if (Number.isFinite(capital) && capital > 0) setStartingCapital(capital);
    const sellDays = Number(searchParams.get("maxDaysToSell") ?? "0");
    setMaxDaysToSell(Number.isFinite(sellDays) && sellDays > 0 ? sellDays : 0);
  }, [searchParams]);

  const syncUrl = useCallback(
    (next: {
      mode?: Mode;
      minProfit?: number;
      category?: string;
      maxEndsInHours?: number;
      maxDaysToSell?: number;
      page?: number;
      maxBudget?: number;
      monthlyGoal?: number;
      startingCapital?: number;
    }) => {
      const params = new URLSearchParams();
      const nextMode = next.mode ?? mode;
      const cat = next.category ?? category;
      const profit = next.minProfit ?? minProfit;
      const hours = next.maxEndsInHours ?? maxEndsInHours;
      const sellDays = next.maxDaysToSell ?? maxDaysToSell;
      const nextPage = next.page ?? page;
      const budget = next.maxBudget ?? maxBudget;
      const goal = next.monthlyGoal ?? monthlyGoal;
      const capital = next.startingCapital ?? startingCapital;

      if (nextMode !== "scan") params.set("mode", nextMode);
      if (cat !== "Watches") params.set("category", cat);
      if (profit !== 75) params.set("minProfit", String(profit));
      if (hours !== 48) params.set("maxEndsInHours", String(hours));
      if (sellDays > 0) params.set("maxDaysToSell", String(sellDays));
      if (nextPage > 1) params.set("page", String(nextPage));
      if (nextMode === "budget") params.set("maxBudget", String(budget));
      if (nextMode === "monthly") {
        params.set("monthlyGoal", String(goal));
        params.set("startingCapital", String(capital));
      }
      const qs = params.toString();
      router.replace(qs ? `/flip?${qs}` : "/flip", { scroll: false });
    },
    [mode, category, minProfit, maxEndsInHours, maxDaysToSell, page, maxBudget, monthlyGoal, startingCapital, router],
  );

  const scan = useCallback(() => {
    setError("");
    setExpanded(null);
    startTransition(async () => {
      try {
        const params = new URLSearchParams({
          minProfit: String(minProfit),
          category,
          maxEndsInHours: String(maxEndsInHours),
          page: String(page),
          pageSize: String(PAGE_SIZE),
        });
        if (maxDaysToSell > 0) params.set("maxDaysToSell", String(maxDaysToSell));
        if (mode === "budget") params.set("maxBudget", String(maxBudget));
        if (mode === "monthly") {
          params.set("monthlyGoal", String(monthlyGoal));
          params.set("startingCapital", String(startingCapital));
        }
        const res = await fetch(`/api/flip/opportunities?${params}`);
        const json = (await res.json()) as ApiResult;
        if (!res.ok) {
          setError(json.error ?? "Scan failed");
          setData(null);
          return;
        }
        setData(json);
        if (json.page !== page) setPage(json.page);
        if (json.opportunities?.length) {
          const fresh = rememberScanIds(json.opportunities.map((o) => o.id));
          setFreshIds((prev) => {
            const next = new Set(prev);
            for (const id of fresh) next.add(id);
            return next;
          });
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Scan failed");
        setData(null);
      }
    });
  }, [minProfit, category, maxEndsInHours, maxDaysToSell, page, mode, maxBudget, monthlyGoal, startingCapital]);

  useEffect(() => {
    scan();
  }, [scan]);

  function goToPage(next: number) {
    const safe = Math.max(1, next);
    setPage(safe);
    syncUrl({ page: safe });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetFilters(patch: {
    mode?: Mode;
    minProfit?: number;
    category?: string;
    maxEndsInHours?: number;
    maxDaysToSell?: number;
    maxBudget?: number;
    monthlyGoal?: number;
    startingCapital?: number;
  }) {
    setPage(1);
    if (patch.mode != null) setMode(patch.mode);
    if (patch.minProfit != null) setMinProfit(patch.minProfit);
    if (patch.category != null) setCategory(patch.category);
    if (patch.maxEndsInHours != null) setMaxEndsInHours(patch.maxEndsInHours);
    if (patch.maxDaysToSell != null) setMaxDaysToSell(patch.maxDaysToSell);
    if (patch.maxBudget != null) setMaxBudget(patch.maxBudget);
    if (patch.monthlyGoal != null) setMonthlyGoal(patch.monthlyGoal);
    if (patch.startingCapital != null) setStartingCapital(patch.startingCapital);
    syncUrl({ ...patch, page: 1 });
  }

  const from = data && data.total > 0 ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = data ? Math.min(data.page * data.pageSize, data.total) : 0;
  const planIds = new Set(data?.plan?.selected.map((o) => o.id) ?? []);

  return (
    <div className="space-y-6">
      <div className="card space-y-4 p-5">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["scan", "Find deals"],
              ["budget", "My budget"],
              ["monthly", "Monthly target"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => resetFilters({ mode: id })}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                mode === id
                  ? "bg-brand-500/20 text-brand-200"
                  : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "budget" && (
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              How much can you invest right now?
            </div>
            <label className="mt-2 flex items-center gap-2 text-sm text-slate-300">
              £
              <input
                type="number"
                min={50}
                step={50}
                value={maxBudget}
                onChange={(e) => setMaxBudget(Math.max(50, Number(e.target.value) || 50))}
                onBlur={() => resetFilters({ maxBudget })}
                className="w-28 rounded border border-white/10 bg-ink-900 px-2 py-1.5 text-white"
              />
              <span className="text-slate-500">max per scan pack</span>
            </label>
          </div>
        )}

        {mode === "monthly" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-slate-400">
              I want to make (£ / month)
              <input
                type="number"
                min={100}
                step={100}
                value={monthlyGoal}
                onChange={(e) => setMonthlyGoal(Math.max(100, Number(e.target.value) || 100))}
                onBlur={() => resetFilters({ monthlyGoal })}
                className="mt-1 block w-full rounded border border-white/10 bg-ink-900 px-3 py-2 text-white"
              />
            </label>
            <label className="text-sm text-slate-400">
              I can start with (£)
              <input
                type="number"
                min={50}
                step={50}
                value={startingCapital}
                onChange={(e) => setStartingCapital(Math.max(50, Number(e.target.value) || 50))}
                onBlur={() => resetFilters({ startingCapital })}
                className="mt-1 block w-full rounded border border-white/10 bg-ink-900 px-3 py-2 text-white"
              />
            </label>
          </div>
        )}

        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Minimum net profit per deal
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {PROFIT_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => resetFilters({ minProfit: p })}
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
                onChange={(e) => setMinProfit(Math.max(0, Number(e.target.value) || 0))}
                onBlur={() => resetFilters({ minProfit })}
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
              onChange={(e) => resetFilters({ category: e.target.value })}
              className="ml-2 max-w-[200px] rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-slate-200"
            >
              {FLIP_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="all">Top 8 categories</option>
            </select>
          </label>
          <label className="text-sm text-slate-400">
            Ending within
            <select
              value={maxEndsInHours}
              onChange={(e) => resetFilters({ maxEndsInHours: Number(e.target.value) })}
              className="ml-2 rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-slate-200"
            >
              <option value={3}>3 hours</option>
              <option value={6}>6 hours</option>
              <option value={12}>12 hours</option>
              <option value={24}>24 hours</option>
              <option value={48}>48 hours</option>
            </select>
          </label>
          <label className="text-sm text-slate-400">
            Estimated sale
            <select
              value={maxDaysToSell}
              onChange={(e) => resetFilters({ maxDaysToSell: Number(e.target.value) })}
              className="ml-2 rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-slate-200"
            >
              <option value={0}>Any time</option>
              <option value={3}>Within 3 days</option>
              <option value={7}>Within 7 days</option>
              <option value={14}>Within 14 days</option>
              <option value={30}>Within 30 days</option>
              <option value={60}>Within 60 days</option>
            </select>
          </label>
          <button type="button" onClick={scan} disabled={pending} className="btn-primary px-4 py-2 text-sm disabled:opacity-50">
            {pending ? "Scanning…" : "Scan again"}
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {["Watches", "Power Tools", "Cameras", "Graphics Cards", "Gaming Consoles", "iPads"].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => resetFilters({ category: c })}
              className={`rounded-md px-2.5 py-1 text-xs transition ${
                category === c ? "bg-brand-500/20 text-brand-200" : "bg-white/5 text-slate-400 hover:text-white"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <p className="text-xs text-slate-500">
          Ranked by expected profit per day, not headline profit. Dead-demand auctions, parts, and replicas are
          auto-hidden. Liquidity is a Phase A proxy from live bids and active competition—not confirmed sold history.
          Always verify sold prices before bidding. Tap <span className="text-slate-300">Watch</span> to park deals on{" "}
          <Link href="/flip/desk" className="text-brand-300 hover:underline">
            My Desk
          </Link>
          {activeCount > 0 ? ` (${activeCount} active)` : ""}.
        </p>
      </div>

      {data?.plan && (
        <div className="card space-y-3 border border-brand-500/20 bg-brand-500/5 p-5">
          <div className="text-xs font-medium uppercase tracking-wide text-brand-300">
            {data.plan.mode === "monthly" ? "Monthly path" : "Budget pack"}
          </div>
          <p className="text-sm text-slate-200">{data.plan.summary}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Spend now" value={`£${data.plan.totalSpend.toLocaleString("en-GB")}`} />
            <Stat label="Est. profit" value={`£${data.plan.totalProfit.toLocaleString("en-GB")}`} accent />
            <Stat label="Leftover" value={`£${data.plan.leftover.toLocaleString("en-GB")}`} />
            {data.plan.flipsNeeded != null ? (
              <Stat label="Flips to goal" value={String(data.plan.flipsNeeded)} />
            ) : (
              <Stat label="Deals in pack" value={String(data.plan.selected.length)} />
            )}
          </div>
        </div>
      )}

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
            {data.total === 0
              ? "No opportunities"
              : `Showing ${from}–${to} of ${data.total} · scanned ${data.scanned} auctions`}
            {data.skippedRisky ? ` · skipped ${data.skippedRisky} parts/risky` : ""}
            {data.skippedIlliquid ? ` · skipped ${data.skippedIlliquid} dead-demand` : ""}
          </span>
          <span className="text-xs uppercase tracking-wide text-slate-500">{data.source}</span>
        </div>
      )}

      {pending && !data && (
        <div className="card p-8 text-center text-sm text-slate-400">Scanning ending-soon auctions…</div>
      )}

      {pending && data && <div className="text-center text-xs text-slate-500">Updating results…</div>}

      {data && data.opportunities.length === 0 && data.source === "live" && !pending && (
        <div className="card p-8 text-center text-sm text-slate-400">
          No auctions currently clear £{minProfit}+ estimated net profit in this window
          {mode === "budget" ? ` under your £${maxBudget} budget` : ""}
          {mode === "monthly" ? ` under your £${startingCapital} starting capital` : ""}. Try a lower target or wider
          time range.
        </div>
      )}

      <div className="space-y-3">
        {data?.opportunities.map((opp) => (
          <OpportunityCard
            key={opp.id}
            opp={opp}
            isNew={freshIds.has(opp.id)}
            watching={isWatching(opp.id)}
            inPack={planIds.has(opp.id)}
            expanded={expanded === opp.id}
            onToggle={() => setExpanded(expanded === opp.id ? null : opp.id)}
            onWatch={() => watch(opp)}
            onUnwatch={() => unwatch(opp.id)}
          />
        ))}
      </div>

      {data && data.totalPages > 1 && (
        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          pending={pending}
          onPrev={() => goToPage(data.page - 1)}
          onNext={() => goToPage(data.page + 1)}
          onGoto={goToPage}
        />
      )}
    </div>
  );
}

function dealTone(band: DealScoreBand): string {
  switch (band) {
    case "buy":
      return "bg-emerald-500/15 text-emerald-200";
    case "good":
      return "bg-brand-500/15 text-brand-200";
    case "watch":
      return "bg-amber-500/15 text-amber-200";
    default:
      return "bg-white/5 text-slate-400";
  }
}

function liquidityTone(label: FlipOpportunity["liquidityLabel"]): string {
  if (label === "fast") return "bg-emerald-500/15 text-emerald-200";
  if (label === "steady") return "bg-brand-500/15 text-brand-200";
  if (label === "slow") return "bg-amber-500/15 text-amber-200";
  return "bg-red-500/15 text-red-200";
}

function OpportunityCard({
  opp,
  isNew,
  watching,
  inPack,
  expanded,
  onToggle,
  onWatch,
  onUnwatch,
}: {
  opp: FlipOpportunity;
  isNew: boolean;
  watching: boolean;
  inPack: boolean;
  expanded: boolean;
  onToggle: () => void;
  onWatch: () => void;
  onUnwatch: () => void;
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
    <article className={`card overflow-hidden ${inPack ? "ring-1 ring-brand-500/40" : ""}`}>
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
            {isNew && (
              <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-200">New</span>
            )}
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${dealTone(opp.dealBand)}`}>
              Deal {opp.dealScore}/100
            </span>
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${liquidityTone(opp.liquidityLabel)}`}>
              Liquidity {opp.liquidityScore}/100
            </span>
            {inPack && (
              <span className="rounded bg-brand-500/20 px-2 py-0.5 text-xs font-medium text-brand-200">In your pack</span>
            )}
            <span className="rounded bg-white/5 px-2 py-0.5 text-xs text-slate-300">{opp.category}</span>
            {opp.brand && <span className="rounded bg-brand-500/15 px-2 py-0.5 text-xs text-brand-200">{opp.brand}</span>}
            <span className="text-xs text-slate-500">Ends {endsLabel}</span>
          </div>
          <h2 className="mt-1 line-clamp-2 font-medium text-white">{opp.title}</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {opp.dealLabel}
            {opp.bestSellMarket ? ` · Best sell: ${opp.bestSellMarket}` : ""}
            {opp.location ? ` · ${opp.location}` : ""}
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Buy now" value={`£${opp.currentPrice.toLocaleString("en-GB")}`} />
            <Stat label="Risk-adj. resale" value={`£${opp.marketValue.toLocaleString("en-GB")}`} />
            <Stat label="Net profit" value={`£${opp.netProfit.toLocaleString("en-GB")}`} accent />
            <Stat label="Profit / day" value={`£${opp.profitPerDay.toLocaleString("en-GB")}`} accent />
            <Stat label="Est. sell time" value={`~${opp.estimatedDaysToSell}d`} />
            <Stat
              label="Auction demand"
              value={opp.auctionBidRatePct == null ? "Unknown" : `${opp.auctionBidRatePct}% bid`}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-white/5 px-4 py-3">
        <a href={opp.ebayUrl} target="_blank" rel="noreferrer" className="btn-primary px-4 py-2 text-sm">
          Open on eBay
        </a>
        {watching ? (
          <button
            type="button"
            onClick={onUnwatch}
            className="rounded-lg bg-brand-500/20 px-3 py-2 text-sm text-brand-200 hover:bg-brand-500/30"
          >
            Watching ✓
          </button>
        ) : (
          <button
            type="button"
            onClick={onWatch}
            className="rounded-lg bg-white/5 px-3 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white"
          >
            Watch
          </button>
        )}
        <span className="text-xs text-slate-400">
          Max bid ≈ <span className="text-slate-200">£{opp.maxBid.toLocaleString("en-GB")}</span>
        </span>
        <button type="button" onClick={onToggle} className="ml-auto text-xs text-brand-300 hover:underline">
          {expanded ? "Hide details" : "Why + where to sell"}
        </button>
      </div>

      {expanded && (
        <div className="space-y-4 border-t border-white/5 bg-white/[0.02] px-4 py-3">
          <ul className="space-y-1.5 text-sm text-slate-300">
            {opp.why.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="text-brand-400">·</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>

          {opp.sellMarkets?.length > 0 && (
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Where to sell</div>
              <div className="overflow-x-auto rounded-xl border border-white/5">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-xs uppercase text-slate-500">
                      <th className="px-3 py-2">Marketplace</th>
                      <th className="px-3 py-2">Est. sale</th>
                      <th className="px-3 py-2">Net profit</th>
                      <th className="px-3 py-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {opp.sellMarkets.map((m) => (
                      <tr key={m.id} className="text-slate-300">
                        <td className="px-3 py-2 font-medium text-white">{m.name}</td>
                        <td className="px-3 py-2">£{m.salePrice.toLocaleString("en-GB")}</td>
                        <td className={`px-3 py-2 ${m.netProfit >= opp.netProfit ? "text-emerald-300" : ""}`}>
                          £{m.netProfit.toLocaleString("en-GB")}
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-500">{m.feeNote}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {opp.riskFlags.length > 0 && (
            <p className="text-xs text-amber-300">Risk flags: {opp.riskFlags.join(", ")}</p>
          )}
          <p className="text-xs text-slate-500">
            Estimates only — confirm sold comps, condition, and marketplace fees before you buy or list.
          </p>
        </div>
      )}
    </article>
  );
}

function Pagination({
  page,
  totalPages,
  pending,
  onPrev,
  onNext,
  onGoto,
}: {
  page: number;
  totalPages: number;
  pending: boolean;
  onPrev: () => void;
  onNext: () => void;
  onGoto: (p: number) => void;
}) {
  const windowSize = 5;
  let start = Math.max(1, page - Math.floor(windowSize / 2));
  const end = Math.min(totalPages, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);
  const pages: number[] = [];
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
      <button
        type="button"
        disabled={pending || page <= 1}
        onClick={onPrev}
        className="rounded-lg bg-white/5 px-3 py-2 text-sm text-slate-300 hover:bg-white/10 disabled:opacity-40"
      >
        ← Prev
      </button>
      <div className="flex flex-wrap items-center gap-1">
        {pages.map((n) => (
          <button
            key={n}
            type="button"
            disabled={pending}
            onClick={() => onGoto(n)}
            className={`min-w-9 rounded-lg px-2.5 py-2 text-sm transition disabled:opacity-40 ${
              page === n ? "bg-brand-500/20 text-brand-200" : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={pending || page >= totalPages}
        onClick={onNext}
        className="rounded-lg bg-white/5 px-3 py-2 text-sm text-slate-300 hover:bg-white/10 disabled:opacity-40"
      >
        Next →
      </button>
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
