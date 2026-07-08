import Link from "next/link";

export function PlannerPagination({
  page,
  totalPages,
  total,
  pageSize,
  from,
  mode,
  service,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  from: string;
  mode: string;
  service?: string;
}) {
  if (totalPages <= 1) return null;

  const base = new URLSearchParams({ from, mode });
  if (service) base.set("service", service);

  const pageHref = (p: number) => {
    const q = new URLSearchParams(base);
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return `/planner${s ? `?${s}` : ""}`;
  };

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  const windowPages = pageWindow(page, totalPages);

  return (
    <nav className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4" aria-label="Planner pages">
      <p className="text-xs text-slate-500">
        Showing <span className="text-slate-300">{start}–{end}</span> of{" "}
        <span className="text-slate-300">{total.toLocaleString("en-GB")}</span> jobs
      </p>

      <div className="flex flex-wrap items-center gap-1">
        {page > 1 ? (
          <Link href={pageHref(page - 1)} className="chip bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white">
            ← Prev
          </Link>
        ) : (
          <span className="chip bg-white/[0.02] text-slate-600">← Prev</span>
        )}

        {windowPages.map((p, i) =>
          p === "…" ? (
            <span key={`gap-${i}`} className="px-1 text-slate-600">
              …
            </span>
          ) : (
            <Link
              key={p}
              href={pageHref(p)}
              className={`chip min-w-[2.25rem] justify-center ${
                p === page ? "bg-brand-500/20 text-brand-200" : "bg-white/5 text-slate-400 hover:text-white"
              }`}
              aria-current={p === page ? "page" : undefined}
            >
              {p}
            </Link>
          ),
        )}

        {page < totalPages ? (
          <Link href={pageHref(page + 1)} className="chip bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white">
            Next →
          </Link>
        ) : (
          <span className="chip bg-white/[0.02] text-slate-600">Next →</span>
        )}
      </div>
    </nav>
  );
}

function pageWindow(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

  const out: (number | "…")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) out.push("…");
    out.push(sorted[i]);
  }
  return out;
}
