"use client";

import { useState, useTransition } from "react";
import { publishAllIntentDrafts, setIntentCampaignStatus, syncIntentCampaignsFromCatalog } from "./actions";

export type IntentRow = {
  id: string;
  slug: string;
  h1: string;
  serviceName: string;
  status: string;
  intentGroup: string | null;
  category: string;
  demandIdeaId: string | null;
};

export function IntentManager({
  initialRows,
  total,
  published,
}: {
  initialRows: IntentRow[];
  total: number;
  published: number;
}) {
  const [rows, setRows] = useState(initialRows);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function sync() {
    startTransition(async () => {
      const result = await syncIntentCampaignsFromCatalog();
      setMessage(`Synced: ${result.created} created, ${result.updated} updated (${result.total} ideas).`);
      window.location.reload();
    });
  }

  function publishAll() {
    startTransition(async () => {
      const result = await publishAllIntentDrafts();
      setMessage(`Published ${result.count} drafts.`);
      window.location.reload();
    });
  }

  function toggleStatus(id: string, current: string) {
    const next = current === "published" ? "draft" : "published";
    startTransition(async () => {
      await setIntentCampaignStatus(id, next);
      setRows((r) => r.map((row) => (row.id === id ? { ...row, status: next } : row)));
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={pending} onClick={sync} className="btn-primary px-4 py-2 text-sm disabled:opacity-50">
          Sync 1,000 from catalog
        </button>
        <button type="button" disabled={pending} onClick={publishAll} className="btn-ghost px-4 py-2 text-sm disabled:opacity-50">
          Publish all drafts
        </button>
        <a href="/need" className="btn-ghost px-4 py-2 text-sm" target="_blank" rel="noreferrer">
          View /need hub
        </a>
      </div>

      <div className="text-sm text-slate-400">
        {published.toLocaleString()} published / {total.toLocaleString()} total campaigns
      </div>

      {message && <p className="text-sm text-brand-300">{message}</p>}

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-white/10 bg-white/[0.02] text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Page</th>
              <th className="px-3 py-2">Group</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-white/5">
                <td className="px-3 py-2">
                  <a href={`/need/${row.slug}`} className="font-medium text-white hover:underline" target="_blank" rel="noreferrer">
                    {row.h1}
                  </a>
                  <div className="text-xs text-slate-500">/need/{row.slug}</div>
                </td>
                <td className="px-3 py-2 text-slate-400">{row.intentGroup ?? row.category}</td>
                <td className="px-3 py-2">
                  <span
                    className={
                      row.status === "published"
                        ? "text-emerald-400"
                        : "text-amber-400"
                    }
                  >
                    {row.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => toggleStatus(row.id, row.status)}
                    className="text-xs text-brand-300 hover:underline disabled:opacity-50"
                  >
                    {row.status === "published" ? "Unpublish" : "Publish"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
