import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { toDTO } from "@/lib/signals";
import { getSignalType } from "@/lib/taxonomy";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { getCurrentUser } from "@/lib/session";
import { isSignalSaved } from "@/lib/shortlist";
import { SaveButton } from "@/components/SaveButton";
import {
  BUSINESS_TYPES,
  formatGBP,
  formatGBPSigned,
  getBusinessType,
  translate,
  type GrowthGoal,
} from "@/lib/opportunity";

const GOALS: GrowthGoal[] = ["leads", "revenue", "locations", "hiring", "partnerships"];

export const dynamic = "force-dynamic";

// Per-signal metadata so each signal page is a rich, shareable link (Slack,
// LinkedIn, X) and indexable by search engines.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const row = await prisma.signal.findUnique({ where: { id } }).catch(() => null);
  if (!row) return { title: "Signal not found" };

  const typeLabel = getSignalType(row.type)?.label ?? row.type;
  const description = (row.whatChanged || row.summary || "").slice(0, 200);
  const title = row.title;
  const url = `/signals/${row.id}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title,
      description,
      url,
      siteName: "Signals For Me",
      tags: [typeLabel, row.groupName, row.category],
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function SignalDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await prisma.signal.findUnique({
    where: { id },
    include: { opportunities: true, risks: true },
  });
  if (!row) notFound();
  const s = toDTO(row);

  // Translate this signal into an opportunity for the viewer's business (or a
  // general estimate when signed out / no profile yet).
  const user = await getCurrentUser().catch(() => null);
  const bt = getBusinessType(user?.businessType);
  const text = `${s.title} ${s.summary} ${s.whatChanged ?? ""} ${s.entityName ?? ""} ${s.entityLocation ?? ""}`.toLowerCase();
  const industryMatch = bt.keywords.some((k) => text.includes(k));
  const locTerms = (user?.location ?? "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2);
  const locationMatch = locTerms.some((t) => text.includes(t));
  const goalRaw = (user?.growthGoal || "").trim();
  const growthGoal = (GOALS as string[]).includes(goalRaw) ? (goalRaw as GrowthGoal) : undefined;
  const opp = translate(s, bt, {
    location: user?.location ?? "",
    growthGoal,
    locationMatch,
    industryMatch,
  });
  const btLabel = BUSINESS_TYPES.find((b) => b.key === bt.key)?.label ?? "your business";
  const isGeneric = !user?.businessType;
  const saved = user ? await isSignalSaved(user.id, s.id) : false;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/brief" className="text-sm text-slate-400 hover:text-white">
        ← Back to opportunities
      </Link>

      <div className="card mt-4 p-5 sm:p-7">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="chip border border-brand-400/30 bg-brand-500/10 text-brand-200">{s.typeLabel}</span>
          <span className="chip bg-white/5 text-slate-400">{s.groupName}</span>
          <ConfidenceBadge value={s.confidence} />
          {s.entityLocation && <span className="chip bg-white/5 text-slate-400">{s.entityLocation}</span>}
        </div>

        <h1 className="text-2xl font-bold text-white">{s.title}</h1>
        {s.whatChanged && (
          <p className="mt-2 text-base font-medium text-slate-200">{s.whatChanged}</p>
        )}
        <p className="mt-2 text-slate-300">{s.summary}</p>

        {s.entityName && (
          <div className="mt-4 text-sm text-slate-400">
            Entity: <span className="text-slate-200">{s.entityName}</span>
          </div>
        )}

        {/* Opportunity panel — the signal translated into money for your business */}
        <div className="mt-6 rounded-2xl border border-signal-growth/25 bg-signal-growth/[0.05] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-signal-growth">
              {opp.defensive ? "Revenue at risk for a" : "Opportunity for a"} {btLabel.toLowerCase()}
            </div>
            <span className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] font-bold text-slate-300" title="Opportunity score / 100">
              {opp.score} / 100
            </span>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <PanelStat label="Expected value" tone={opp.expectedValue >= 0 ? "growth" : "risk"}>
              {formatGBPSigned(opp.expectedValue)}
            </PanelStat>
            <PanelStat label={opp.defensive ? "Revenue at risk" : "Revenue potential"}>
              {opp.revenueLabel}
            </PanelStat>
            <PanelStat label="Confidence">{Math.round(s.confidence * 100)}%</PanelStat>
            <PanelStat label="Urgency / effort" className="capitalize">
              {opp.urgency} / {opp.effort}
            </PanelStat>
          </div>

          <div className="mt-3 rounded-xl border border-signal-hiring/30 bg-signal-hiring/[0.06] p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-signal-hiring">Recommended action</div>
            <p className="mt-1 text-sm text-slate-200">{opp.action}</p>
          </div>

          <details className="mt-3 text-sm text-slate-400">
            <summary className="cursor-pointer select-none text-xs text-slate-500 hover:text-slate-300">
              How we estimated this
            </summary>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-400">
              {opp.assumptions.map((a, i) => (
                <li key={i} className="break-words">{a}</li>
              ))}
            </ul>
          </details>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <SaveButton signalId={s.id} initialSaved={saved} />
            <Link href="/brief" className="btn-ghost text-sm">
              Compare more →
            </Link>
            {isGeneric && (
              <span className="text-xs text-slate-500">
                <Link href="/onboarding" className="underline hover:text-white">Set your business type</Link> for tailored numbers.
              </span>
            )}
          </div>
        </div>

        {s.affectedIndustries.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {s.affectedIndustries.map((ind, i) => (
              <span key={i} className="chip bg-white/5 text-slate-300">
                {ind}
              </span>
            ))}
          </div>
        )}

        {s.opportunities.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Opportunities created
            </h2>
            <ul className="mt-2 space-y-2">
              {s.opportunities.map((o, i) => (
                <li
                  key={i}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`chip shrink-0 ${
                        o.audience === "consumer"
                          ? "bg-signal-consumer/10 text-signal-consumer"
                          : "bg-brand-500/10 text-brand-200"
                      }`}
                    >
                      {o.audience === "consumer" ? "Consumer" : "Business"}
                    </span>
                    <span className="ml-auto shrink-0 text-xs text-slate-400">
                      {Math.round(o.confidence * 100)}% confidence
                    </span>
                  </div>
                  <p className="mt-1.5 break-words text-slate-200">{o.title}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {(s.whoBenefits.length > 0 || s.whoAtRisk.length > 0) && (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {s.whoBenefits.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-signal-growth">
                  Who benefits
                </h2>
                <ul className="mt-2 space-y-1.5">
                  {s.whoBenefits.map((w, i) => (
                    <li key={i} className="flex items-start gap-2 text-slate-200">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-signal-growth" />
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {s.whoAtRisk.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-signal-distress">
                  Who&apos;s at risk
                </h2>
                <ul className="mt-2 space-y-1.5">
                  {s.whoAtRisk.map((w, i) => (
                    <li key={i} className="flex items-start gap-2 text-slate-200">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-signal-distress" />
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {s.risks.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-signal-distress">Risks</h2>
            <ul className="mt-2 space-y-2">
              {s.risks.map((r, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 rounded-xl border border-signal-distress/20 bg-signal-distress/5 px-3 py-2"
                >
                  <span className="min-w-0 flex-1 break-words text-slate-200">{r.title}</span>
                  <span className="shrink-0 text-xs text-slate-400">
                    {Math.round(r.confidence * 100)}%<span className="hidden sm:inline"> confidence</span>
                  </span>
                </li>
              ))}
            </ul>
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

function PanelStat({
  label,
  children,
  tone,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  tone?: "growth" | "risk";
  className?: string;
}) {
  const valueCls =
    tone === "growth"
      ? "text-lg font-bold text-signal-growth"
      : tone === "risk"
        ? "text-lg font-bold text-signal-distress"
        : "text-sm text-slate-200";
  return (
    <div className="rounded-xl border border-white/10 bg-ink-900/40 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-1 break-words ${valueCls} ${className}`}>{children}</div>
    </div>
  );
}
