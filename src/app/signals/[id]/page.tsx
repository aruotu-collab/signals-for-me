import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { toDTO } from "@/lib/signals";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";

export const dynamic = "force-dynamic";

export default async function SignalDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await prisma.signal.findUnique({ where: { id } });
  if (!row) notFound();
  const s = toDTO(row);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/feed" className="text-sm text-slate-400 hover:text-white">
        ← Back to feed
      </Link>

      <div className="card mt-4 p-7">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="chip border border-brand-400/30 bg-brand-500/10 text-brand-200">{s.typeLabel}</span>
          <span className="chip bg-white/5 text-slate-400">{s.groupName}</span>
          <ConfidenceBadge value={s.confidence} />
          {s.entityLocation && <span className="chip bg-white/5 text-slate-400">{s.entityLocation}</span>}
        </div>

        <h1 className="text-2xl font-bold text-white">{s.title}</h1>
        <p className="mt-2 text-slate-300">{s.summary}</p>

        {s.entityName && (
          <div className="mt-4 text-sm text-slate-400">
            Entity: <span className="text-slate-200">{s.entityName}</span>
          </div>
        )}

        {s.whyItMatters.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Why it matters</h2>
            <ul className="mt-2 space-y-1.5">
              {s.whyItMatters.map((w, i) => (
                <li key={i} className="flex items-start gap-2 text-slate-200">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                  {w}
                </li>
              ))}
            </ul>
          </div>
        )}

        {s.suggestedAction && (
          <div className="mt-6 rounded-xl border border-brand-400/20 bg-brand-500/5 px-4 py-3 text-brand-100">
            <div className="text-xs font-semibold uppercase tracking-wide text-brand-300">Suggested action</div>
            <div className="mt-1">{s.suggestedAction}</div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-sm text-slate-400">
          <span>Source: {s.rawSource}</span>
          {s.sourceUrl && (
            <a href={s.sourceUrl} target="_blank" rel="noreferrer" className="text-brand-300 hover:underline">
              View source ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
