"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useFavourites } from "@/components/FavouritesProvider";
import { AddManualJobForm } from "@/components/my-jobs/AddManualJobForm";
import { EarningsSummary } from "@/components/my-jobs/EarningsSummary";
import { MyJobCard } from "@/components/my-jobs/MyJobCard";
import { ProfitBanner } from "@/components/my-jobs/ProfitBanner";
import { useShiplyJobLookup } from "@/components/my-jobs/useShiplyJobLookup";
import type { JobStatus } from "@/lib/favourites";
import { sumJobProfits } from "@/lib/jobProfit";
import { useDriverSettings } from "@/lib/shiply/driverSettings";

type Tab = JobStatus;

export default function FavouritesPage() {
  const { favourites, ready, count, signedIn, byStatus, clear } = useFavourites();
  const { settings } = useDriverSettings();
  const [tab, setTab] = useState<Tab>("saved");
  const [showAdd, setShowAdd] = useState(false);

  const saved = byStatus("saved");
  const won = byStatus("won");
  const completed = byStatus("completed");
  const visible = tab === "saved" ? saved : tab === "won" ? won : completed;

  const shiplyKeys = useMemo(
    () => favourites.filter((f) => f.source === "shiply").map((f) => f.sourceId),
    [favourites],
  );
  const shiplyLookup = useShiplyJobLookup(shiplyKeys);

  const profitSummary = useMemo(
    () => sumJobProfits(visible, settings, shiplyLookup),
    [visible, settings, shiplyLookup],
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="chip border border-white/10 bg-white/5 text-slate-300">My jobs</span>
          <h1 className="mt-2 text-2xl font-bold text-white">Your job board</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            One place for every job — saved shortlist, work you&apos;ve won, and completed history.
            Track profit across Shiply, eBay, and jobs won elsewhere.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setShowAdd(true)} className="btn-primary px-4 py-2 text-sm">
            + Add manual job
          </button>
          <Link href="/matrix" className="btn-ghost px-4 py-2 text-sm">
            Find more jobs
          </Link>
        </div>
      </header>

      {ready && !signedIn && count > 0 && (
        <div className="card flex flex-wrap items-center justify-between gap-3 border border-brand-500/20 bg-brand-500/5 p-4 text-sm text-slate-300">
          <span>
            Stored on this device only.{" "}
            <Link href="/login" className="font-medium text-brand-300 underline">
              Sign in
            </Link>{" "}
            to sync your job board across phone, tablet and laptop.
          </span>
        </div>
      )}

      {!ready ? (
        <div className="card p-8 text-center text-sm text-slate-400">Loading…</div>
      ) : count === 0 ? (
        <div className="card p-10 text-center">
          <div className="text-4xl">📋</div>
          <p className="mt-3 text-sm text-slate-400">
            No jobs yet. Star jobs in{" "}
            <Link href="/matrix" className="text-brand-300 underline">
              Pickup Radar
            </Link>
            ,{" "}
            <Link href="/planner" className="text-brand-300 underline">
              planner
            </Link>{" "}
            or{" "}
            <Link href="/opportunities" className="text-brand-300 underline">
              eBay opportunities
            </Link>
            , or add a job you&apos;ve already won.
          </p>
          <button type="button" onClick={() => setShowAdd(true)} className="btn-primary mt-4 px-4 py-2 text-sm">
            Add manual job
          </button>
        </div>
      ) : (
        <>
          <EarningsSummary shiplyLookup={shiplyLookup} />

          <div className="flex flex-wrap items-center gap-2">
            <TabChip label={`Saved (${saved.length})`} active={tab === "saved"} onClick={() => setTab("saved")} />
            <TabChip label={`Won (${won.length})`} active={tab === "won"} onClick={() => setTab("won")} />
            <TabChip label={`Completed (${completed.length})`} active={tab === "completed"} onClick={() => setTab("completed")} />
            <button
              onClick={() => {
                if (confirm("Remove all jobs from your board?")) clear();
              }}
              className="ml-auto text-xs text-slate-500 hover:text-red-300"
            >
              Clear all
            </button>
          </div>

          <ProfitBanner
            status={tab}
            total={profitSummary.total}
            withProfit={profitSummary.withProfit}
            count={profitSummary.count}
          />

          {visible.length === 0 ? (
            <div className="card p-8 text-center text-sm text-slate-400">
              {tab === "saved" && "No saved jobs — star jobs to shortlist them here."}
              {tab === "won" && "No won jobs — tap “I won this” on a saved job, or add a manual job."}
              {tab === "completed" && "No completed jobs yet — mark won jobs as complete when you finish."}
            </div>
          ) : (
            <ul className="space-y-3">
              {visible.map((job) => (
                <MyJobCard key={job.key} job={job} settings={settings} shiplyLookup={shiplyLookup} />
              ))}
            </ul>
          )}
        </>
      )}

      {showAdd && <AddManualJobForm onClose={() => setShowAdd(false)} />}
    </div>
  );
}

function TabChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`chip ${active ? "bg-brand-500/20 text-brand-200" : "bg-white/5 text-slate-400 hover:text-white"}`}
    >
      {label}
    </button>
  );
}
