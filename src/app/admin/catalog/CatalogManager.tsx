"use client";

import { useState, useTransition } from "react";
import { updateCatalogIdea, importCatalogJson, syncFromBuiltInCatalog } from "./actions";
import { DEMAND_CATEGORIES } from "@/lib/demandCategories";

export type CatalogRow = {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string | null;
  status: string;
  _count: { votes: number; comments: number };
};

export function CatalogManager({ initialRows }: { initialRows: CatalogRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [editing, setEditing] = useState<CatalogRow | null>(null);
  const [importJson, setImportJson] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  const filtered = rows.filter((r) => {
    if (cat && r.category !== cat) return false;
    if (!q) return true;
    const hay = `${r.title} ${r.description}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  function saveEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateCatalogIdea({
        id: editing.id,
        title: String(fd.get("title")),
        description: String(fd.get("description")),
        category: String(fd.get("category")),
        location: String(fd.get("location") || "") || null,
        status: String(fd.get("status")),
      });
      if (result.error) setMessage(result.error);
      else {
        setRows((prev) =>
          prev.map((r) =>
            r.id === editing.id
              ? {
                  ...r,
                  title: String(fd.get("title")),
                  description: String(fd.get("description")),
                  category: String(fd.get("category")),
                  location: String(fd.get("location") || "") || null,
                  status: String(fd.get("status")),
                }
              : r,
          ),
        );
        setEditing(null);
        setMessage("Saved.");
      }
    });
  }

  function doImport(mode: "replace" | "merge") {
    startTransition(async () => {
      const result = await importCatalogJson(importJson, mode);
      if (result.error) setMessage(result.error);
      else {
        setMessage(`Import done — ${result.created} created (${result.total} rows). Refresh to see all.`);
        window.location.reload();
      }
    });
  }

  function doSync() {
    if (!confirm("Replace all platform ideas with the built-in 1,000-idea catalog? User votes on those ideas will be deleted.")) return;
    startTransition(async () => {
      const result = await syncFromBuiltInCatalog();
      if (result.ok) {
        setMessage(`Synced ${result.count} ideas from built-in catalog.`);
        window.location.reload();
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search titles & descriptions…"
          className="min-w-[200px] flex-1 rounded-xl border border-white/10 bg-ink-900 px-4 py-2 text-sm text-white"
        />
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          className="rounded-xl border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white"
        >
          <option value="">All categories</option>
          {DEMAND_CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.icon} {c.label}
            </option>
          ))}
        </select>
        <a href="/api/admin/catalog/export" className="btn-ghost px-4 py-2 text-sm">
          Export JSON
        </a>
        <button type="button" onClick={doSync} disabled={pending} className="btn-primary px-4 py-2 text-sm">
          Sync built-in catalog
        </button>
      </div>

      <p className="text-sm text-slate-500">
        Showing {filtered.length} of {rows.length} platform ideas
      </p>

      {message && <p className="text-sm text-brand-300">{message}</p>}

      {editing && (
        <form onSubmit={saveEdit} className="card space-y-3 p-5">
          <h3 className="font-semibold text-white">Edit idea</h3>
          <input name="title" defaultValue={editing.title} required className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-white" />
          <textarea name="description" defaultValue={editing.description} required rows={4} className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-white" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <select name="category" defaultValue={editing.category} className="rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-white">
              {DEMAND_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
            <input name="location" defaultValue={editing.location ?? ""} placeholder="Location" className="rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-white" />
            <select name="status" defaultValue={editing.status} className="rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-white">
              <option value="active">active</option>
              <option value="archived">archived</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="btn-primary px-4 py-2 text-sm">
              Save
            </button>
            <button type="button" onClick={() => setEditing(null)} className="btn-ghost px-4 py-2 text-sm">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="card divide-y divide-white/5 overflow-hidden">
        {filtered.slice(0, 100).map((r) => (
          <div key={r.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="text-xs text-slate-500">{r.category} · {r._count.votes} votes</div>
              <div className="font-medium text-white">{r.title}</div>
              <p className="mt-1 line-clamp-2 text-sm text-slate-400">{r.description}</p>
            </div>
            <button type="button" onClick={() => setEditing(r)} className="btn-ghost shrink-0 px-3 py-1.5 text-xs">
              Edit
            </button>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-white">Import JSON</h3>
        <p className="mt-1 text-sm text-slate-400">Paste an array of {"{ title, description, category, location? }"} objects.</p>
        <textarea
          value={importJson}
          onChange={(e) => setImportJson(e.target.value)}
          rows={6}
          className="mt-3 w-full rounded-xl border border-white/10 bg-ink-900 px-3 py-2 font-mono text-xs text-white"
          placeholder='[{"title":"...","description":"...","category":"health"}]'
        />
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => doImport("merge")} disabled={pending || !importJson} className="btn-ghost px-4 py-2 text-sm">
            Merge import
          </button>
          <button type="button" onClick={() => doImport("replace")} disabled={pending || !importJson} className="btn-ghost px-4 py-2 text-sm">
            Replace platform ideas
          </button>
        </div>
      </div>
    </div>
  );
}
