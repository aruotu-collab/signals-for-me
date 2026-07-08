import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import {
  LISTING_SOURCE_FILTERS,
  listingSourceForJob,
  listingSourceLabel,
  parseListingSourceFilter,
} from "@/lib/shiply/listingSource";
import { listingSourcePrismaWhere } from "@/lib/shiply/listingSource";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Job browser", robots: { index: false, follow: false } };

const PAGE_SIZE = 50;

export default async function AdminJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; source?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const source = parseListingSourceFilter(sp.source);
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const where = {
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { pickupTown: { contains: q, mode: "insensitive" as const } },
            { deliveryTown: { contains: q, mode: "insensitive" as const } },
            { pickupHub: { contains: q, mode: "insensitive" as const } },
            { shiplyKey: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...listingSourcePrismaWhere(source),
  };

  const [total, rows, totalAll, shiplyCount, dqcCount] = await Promise.all([
    prisma.shiplyJob.count({ where }),
    prisma.shiplyJob.findMany({
      where,
      orderBy: { importedAt: "desc" },
      skip,
      take: PAGE_SIZE,
      select: {
        shiplyKey: true,
        shiplyUrl: true,
        title: true,
        service: true,
        pickupHub: true,
        pickupTown: true,
        deliveryTown: true,
        miles: true,
        quotes: true,
        importedAt: true,
      },
    }),
    prisma.shiplyJob.count(),
    prisma.shiplyJob.count({ where: listingSourcePrismaWhere("shiply") }),
    prisma.shiplyJob.count({ where: listingSourcePrismaWhere("deliveryquotecompare") }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(p: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (source !== "all") params.set("source", source);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/admin/jobs?${qs}` : "/admin/jobs";
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">Job browser</h1>
        <p className="text-sm text-slate-400">
          Search {totalAll.toLocaleString()} imported jobs ({shiplyCount.toLocaleString()} Shiply ·{" "}
          {dqcCount.toLocaleString()} DQC).
        </p>
      </header>

      <form className="mb-4 flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Title, town, hub, or key…"
          className="min-w-[220px] flex-1 rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-200"
        />
        <select
          name="source"
          defaultValue={source}
          className="rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-200"
        >
          {LISTING_SOURCE_FILTERS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-primary px-4 py-2 text-sm">
          Search
        </button>
        {(q || source !== "all") && (
          <Link href="/admin/jobs" className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:text-white">
            Clear
          </Link>
        )}
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase text-slate-500">
              <th className="px-4 py-3">Imported</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Route</th>
              <th className="px-4 py-3">Mi</th>
              <th className="px-4 py-3">Quotes</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                  No jobs match your search.
                </td>
              </tr>
            ) : (
              rows.map((j) => {
                const src = listingSourceForJob(j.shiplyUrl, j.shiplyKey);
                return (
                  <tr key={j.shiplyKey} className="text-slate-300">
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {j.importedAt.toLocaleDateString("en-GB")}
                    </td>
                    <td className="px-4 py-3 text-xs">{listingSourceLabel(src)}</td>
                    <td className="px-4 py-3 text-xs">{j.service}</td>
                    <td className="px-4 py-3 max-w-xs truncate text-white">{j.title}</td>
                    <td className="px-4 py-3 text-xs">
                      {j.pickupHub} · {j.pickupTown} → {j.deliveryTown}
                    </td>
                    <td className="px-4 py-3">{j.miles ?? "—"}</td>
                    <td className="px-4 py-3">{j.quotes ?? "—"}</td>
                    <td className="px-4 py-3">
                      <a href={j.shiplyUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-300 hover:underline">
                        Open
                      </a>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
          <span>
            Page {page} of {totalPages} · {total.toLocaleString()} result{total === 1 ? "" : "s"}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={pageHref(page - 1)} className="rounded-lg bg-white/5 px-3 py-1.5 hover:bg-white/10">
                ← Prev
              </Link>
            )}
            {page < totalPages && (
              <Link href={pageHref(page + 1)} className="rounded-lg bg-white/5 px-3 py-1.5 hover:bg-white/10">
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
