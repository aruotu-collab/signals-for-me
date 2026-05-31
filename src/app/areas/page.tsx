import type { Metadata } from "next";
import Link from "next/link";
import { querySignals } from "@/lib/signals";
import { getCurrentUser } from "@/lib/session";
import { BUSINESS_TYPES, formatGBP, getBusinessType } from "@/lib/opportunity";
import {
  rankAreas,
  homesByArea,
  uniqueRegions,
  type AreaScore,
  type RevenueLine,
} from "@/lib/areas";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Top Opportunity Areas",
  description:
    "The UK postcodes most likely to generate implant, Invisalign and private-patient revenue for your practice — ranked by 12-month revenue potential.",
};

type SP = { business?: string; region?: string };

export default async function AreasPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const user = await getCurrentUser().catch(() => null);

  // Dentist is the flagship vertical, so it's the default showcase.
  const businessKey = sp.business || user?.businessType || "dentist";
  const bt = getBusinessType(businessKey);
  const region = sp.region || undefined;

  // Live layer: feed real planning / new-housing signals into area catchments.
  let homes: Record<string, number> = {};
  try {
    const dev = await querySignals({ type: "development", minConfidence: 0 });
    homes = homesByArea(
      dev.map((s) => `${s.title} ${s.summary} ${s.entityName ?? ""} ${s.entityLocation ?? ""}`),
    );
  } catch {
    homes = {};
  }

  const ranked = rankAreas(bt.key, homes, { region });
  const top = ranked.slice(0, 12);
  const totalHigh = top.reduce((s, a) => s + a.revenueHigh, 0);
  const liveHomes = Object.values(homes).reduce((s, n) => s + n, 0);
  const isDentist = bt.key === "dentist";
  const regions = uniqueRegions();

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">Top Opportunity Areas</h1>
        <p className="mt-1 text-sm text-slate-400">
          The postcodes most likely to generate revenue for your{" "}
          {bt.label.toLowerCase()}, ranked by 12-month potential. Built from public indicators —
          income, property values, age profile, NHS access &amp; local competition — plus live
          planning data.
        </p>
      </header>

      {/* headline */}
      <div className="card mb-6 flex flex-wrap items-end justify-between gap-4 border-signal-growth/20 p-5">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-400">
            Revenue potential across top {top.length} areas
          </div>
          <div className="mt-1 text-3xl font-bold text-white">up to {formatGBP(totalHigh)}</div>
          <div className="text-xs text-slate-500">
            {bt.label}
            {region ? ` · ${region}` : " · England, Scotland & Wales"} · indicative, see method below
            {liveHomes > 0 ? ` · ${liveHomes.toLocaleString()} new homes from live planning data` : ""}
          </div>
        </div>
        <Link href="/pricing" className="btn-primary px-5 py-2.5">
          Unlock all areas
        </Link>
      </div>

      {/* controls */}
      <form method="get" className="mb-6 flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-400">Business type</span>
          <select name="business" defaultValue={businessKey} className={inputCls}>
            {BUSINESS_TYPES.filter((b) => b.key !== "generic").map((b) => (
              <option key={b.key} value={b.key}>
                {b.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-400">Region</span>
          <select name="region" defaultValue={region ?? ""} className={inputCls}>
            <option value="">All regions</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn-ghost h-[42px]">
          Update
        </button>
      </form>

      {/* ranked table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3 font-semibold">#</th>
                <th className="px-4 py-3 font-semibold">Area</th>
                {isDentist ? (
                  <>
                    <th className="px-3 py-3 text-center font-semibold">Implant</th>
                    <th className="px-3 py-3 text-center font-semibold">Invisalign</th>
                    <th className="px-3 py-3 text-center font-semibold">Private</th>
                  </>
                ) : (
                  <th className="px-3 py-3 text-center font-semibold">Opportunity</th>
                )}
                <th className="px-4 py-3 text-right font-semibold">12-mo revenue potential</th>
              </tr>
            </thead>
            <tbody>
              {top.map((a, i) => (
                <tr key={a.area.code} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-white">
                      {a.area.code} · {a.area.name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {a.area.region}
                      {a.newHomes > 0 && (
                        <span className="ml-2 rounded bg-signal-growth/15 px-1.5 py-0.5 text-[10px] font-medium text-signal-growth">
                          +{a.newHomes} new homes
                        </span>
                      )}
                    </div>
                  </td>
                  {isDentist && a.dental ? (
                    <>
                      <td className="px-3 py-3 text-center"><ScorePill v={a.dental.implantScore} /></td>
                      <td className="px-3 py-3 text-center"><ScorePill v={a.dental.invisalignScore} /></td>
                      <td className="px-3 py-3 text-center"><ScorePill v={a.dental.privateScore} /></td>
                    </>
                  ) : (
                    <td className="px-3 py-3 text-center"><ScorePill v={a.overallScore} /></td>
                  )}
                  <td className="px-4 py-3 text-right">
                    <span className="font-bold text-signal-growth">{a.revenueLabel}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* drill-down for the #1 area */}
      {top[0] && <Breakdown area={top[0]} isDentist={isDentist} />}

      <p className="mt-6 text-xs text-slate-600">
        Scores model the <span className="text-slate-400">likelihood</span> of demand from public
        indicators (ONS income &amp; age, Land Registry house prices, NHS dental access, local
        competition, search interest) and live planning/new-housing signals. They estimate demand
        likelihood, not actual patient records, and revenue figures are indicative ranges — not
        guarantees.
      </p>
    </div>
  );
}

function Breakdown({ area, isDentist }: { area: AreaScore; isDentist: boolean }) {
  return (
    <div className="card mt-6 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-white">
          How #{1} — {area.area.code} {area.area.name} — is calculated
        </h2>
        <span className="text-lg font-bold text-signal-growth">{area.revenueLabel}</span>
      </div>

      <div className="mt-2 rounded-xl border border-signal-hiring/30 bg-signal-hiring/[0.06] p-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-signal-hiring">
          Recommended action
        </div>
        <p className="mt-1 text-sm text-slate-200">{area.action}</p>
      </div>

      {isDentist && area.dental && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="py-2 pr-3 font-semibold">Stream</th>
                <th className="py-2 px-3 text-right font-semibold">Est. cases / yr</th>
                <th className="py-2 px-3 text-right font-semibold">£ per case</th>
                <th className="py-2 pl-3 text-right font-semibold">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {area.dental.lines.map((l) => (
                <LineRow key={l.label} line={l} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <details className="mt-4 text-sm text-slate-400">
        <summary className="cursor-pointer select-none text-xs text-slate-500 hover:text-slate-300">
          Method &amp; assumptions
        </summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-400">
          {area.assumptions.map((a, i) => (
            <li key={i}>{a}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}

function LineRow({ line }: { line: RevenueLine }) {
  const cases =
    Math.round(line.patientsLow) === Math.round(line.patientsHigh)
      ? `${Math.round(line.patientsHigh)}`
      : `${Math.round(line.patientsLow)}–${Math.round(line.patientsHigh)}`;
  return (
    <tr className="border-b border-white/5 last:border-0">
      <td className="py-2 pr-3 text-slate-200">{line.label}</td>
      <td className="py-2 px-3 text-right text-slate-300">{cases}</td>
      <td className="py-2 px-3 text-right text-slate-400">
        £{line.valueLow.toLocaleString()}–£{line.valueHigh.toLocaleString()}
      </td>
      <td className="py-2 pl-3 text-right font-medium text-signal-growth">
        {formatGBP(line.revenueLow)}–{formatGBP(line.revenueHigh)}
      </td>
    </tr>
  );
}

function ScorePill({ v }: { v: number }) {
  const tone =
    v >= 80
      ? "bg-signal-growth/15 text-signal-growth"
      : v >= 60
        ? "bg-signal-buying/15 text-signal-buying"
        : "bg-white/5 text-slate-400";
  return <span className={`inline-block rounded-lg px-2.5 py-1 text-sm font-bold ${tone}`}>{v}</span>;
}

const inputCls =
  "rounded-xl border border-white/10 bg-ink-900/70 px-4 py-2.5 text-sm text-white focus:border-brand-500 focus:outline-none [&>option]:bg-ink-900 [&>option]:text-white";
