"use client";

import { useState, useTransition } from "react";
import { importShiplyXlsx } from "./actions";

type MergeResult = { inserted: number; updated: number; total: number; geocoded?: number };
type RefreshResult = { inserted: number; total: number; geocoded: number; skippedDuplicates: number };

export function ShiplyImportForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<(MergeResult | RefreshResult) & { fullRefresh?: boolean } | null>(null);

  return (
    <form
      className="card max-w-2xl space-y-4 p-6"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        setSuccess(null);

        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          const res = await importShiplyXlsx(fd);
          if ("error" in res && res.error) setError(res.error);
          else if ("ok" in res) setSuccess(res as typeof success);
        });
      }}
    >
      <label className="block">
        <span className="text-sm font-medium text-slate-300">Upload spreadsheet (.xlsx, .xls or .csv)</span>
        <input
          type="file"
          name="file"
          accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
          required
          className="mt-2 block w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-200 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-500/20 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-200 hover:file:bg-brand-500/30"
        />
      </label>

      <label className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <input type="checkbox" name="fullRefresh" className="mt-1" />
        <span className="text-sm text-slate-300">
          <strong className="text-amber-200">Full refresh</strong> — delete all existing jobs and matrix cells, then
          import this file only. Use for a single master export (e.g. deliveryquotecompare.csv). Leave unchecked to
          merge/update alongside existing data.
        </span>
      </label>

      <button type="submit" disabled={pending} className="btn-primary px-5 py-2.5 text-sm disabled:opacity-50">
        {pending ? "Importing…" : "Import and rebuild matrix"}
      </button>

      {success && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-200">
          {success.fullRefresh ? (
            <>
              Full refresh complete — {success.total} rows parsed, {success.inserted} inserted
              {"geocoded" in success && typeof success.geocoded === "number" ? `, ${success.geocoded} geocoded` : ""}
              {"skippedDuplicates" in success && success.skippedDuplicates
                ? `, ${success.skippedDuplicates} duplicates skipped`
                : ""}
              .
            </>
          ) : (
            <>
              Imported {success.total} rows. Inserted {(success as MergeResult).inserted}, updated{" "}
              {(success as MergeResult).updated}
              {typeof (success as MergeResult).geocoded === "number"
                ? `, geocoded ${(success as MergeResult).geocoded}`
                : ""}
              .
            </>
          )}
        </div>
      )}
      {error && <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-200">{error}</div>}

      <div className="text-xs text-slate-500">
        Upload one category file at a time for Shiply merges (e.g. <span className="font-mono">shiply Cars.csv</span>).
        Excel (.xlsx/.xls) and CSV are supported. Category is taken from the filename when using Shiply exports.
      </div>
    </form>
  );
}
