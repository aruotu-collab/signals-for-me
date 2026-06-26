import Link from "next/link";
import { INTENT_GROUPS } from "@/lib/intent/groups";
import { listPublishedCampaigns, countPublishedCampaigns } from "@/lib/intent/queries";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Find Local Services — High-Intent Search",
  description:
    "SignalsForMe intent pages capture what people actively search for — call now or vote to show demand in your area.",
};

export default async function NeedHubPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}) {
  const { group } = await searchParams;
  const [campaigns, total] = await Promise.all([
    listPublishedCampaigns({ intentGroup: group, limit: 48 }),
    countPublishedCampaigns({ intentGroup: group }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <span className="chip border border-white/10 bg-white/5 text-slate-300">Intent Network</span>
        <h1 className="mt-3 text-3xl font-bold text-white">What people are searching for</h1>
        <p className="mt-2 max-w-2xl text-slate-400">
          High-intent service pages — call a local professional or vote to show demand.{" "}
          {total.toLocaleString()} live pages{group ? ` in this category` : ""}.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/need"
          className={`chip ${!group ? "bg-brand-500/20 text-brand-200" : "bg-white/5 text-slate-400 hover:text-white"}`}
        >
          All
        </Link>
        {INTENT_GROUPS.map((g) => (
          <Link
            key={g.key}
            href={`/need?group=${g.key}`}
            className={`chip ${group === g.key ? "bg-brand-500/20 text-brand-200" : "bg-white/5 text-slate-400 hover:text-white"}`}
          >
            {g.icon} {g.label}
          </Link>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {campaigns.map((c) => (
          <Link
            key={c.id}
            href={`/need/${c.slug}`}
            className="card block p-5 transition hover:border-brand-400/30"
          >
            <div className="text-xs text-slate-500">{c.modifierLabel}</div>
            <div className="mt-1 font-semibold text-white">{c.h1}</div>
            <p className="mt-2 line-clamp-2 text-sm text-slate-400">{c.whatIsThis}</p>
          </Link>
        ))}
      </div>

      {campaigns.length === 0 && (
        <p className="text-slate-500">No published intent pages in this group yet.</p>
      )}
    </div>
  );
}
