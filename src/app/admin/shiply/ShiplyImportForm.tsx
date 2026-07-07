"use client";

import { useState, useTransition } from "react";
import { importShiplyXlsx } from "./actions";

export function ShiplyImportForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ inserted: number; updated: number; total: number; geocoded?: number } | null>(
    null,
  );

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
          if ((res as any).error) setError((res as any).error);
          else setSuccess(res as any);
        });
      }}
    >
      <label className="block">
        <span className="text-sm font-medium text-slate-300">Upload .xlsx</span>
        <input
          type="file"
          name="file"
          accept=".xlsx"
          required
          className="mt-2 block w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-200 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-500/20 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-200 hover:file:bg-brand-500/30"
        />
      </label>

      <button type="submit" disabled={pending} className="btn-primary px-5 py-2.5 text-sm disabled:opacity-50">
        {pending ? "Importing…" : "Import and rebuild matrix"}
      </button>

      {success && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-200">
          Imported {success.total} rows. Inserted {success.inserted}, updated {success.updated}
          {typeof success.geocoded === "number" ? `, geocoded ${success.geocoded}` : ""}.
        </div>
      )}
      {error && <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-200">{error}</div>}

      <div className="text-xs text-slate-500">
        Upload one category file at a time (e.g. <span className="font-mono">shiply Cars.xlsx</span>). Scraped Shiply
        exports and the older <span className="font-mono">Jobs Detail</span> template are both supported — the category is
        taken from the filename.
      </div>
    </form>
  );
}

