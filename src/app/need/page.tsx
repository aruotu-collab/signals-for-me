import Link from "next/link";
import { INTENT_GROUPS } from "@/lib/intent/groups";
import { listPublishedCampaigns, countPublishedCampaigns } from "@/lib/intent/queries";
import { NeedHubRequest } from "@/components/NeedHubRequest";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Request Local Services — Get Help Now",
  description:
    "Tell us what you need and where you are. We connect you to local providers — flat tire, plumber, locksmith, and more.",
};

export default async function NeedHubPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; q?: string }>;
}) {
  const { group, q } = await searchParams;
  const [campaigns, total] = await Promise.all([
    listPublishedCampaigns({ intentGroup: group, limit: 48 }),
    countPublishedCampaigns({ intentGroup: group }),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <span className="chip border border-white/10 bg-white/5 text-slate-300">Services</span>
        <h1 className="mt-3 text-3xl font-bold text-white">Get help now</h1>
        <p className="mt-2 max-w-2xl text-slate-400">
          Tell us what you need and where you are — we&apos;ll connect you to a local provider. Browse{" "}
          {total.toLocaleString()} services below.
        </p>
      </div>

      <NeedHubRequest initialService={q ?? ""} />

      <div className="border-t border-white/10 pt-8">
        <h2 className="text-lg font-semibold text-white">Browse by category</h2>
        <div className="mt-4 flex flex-wrap gap-2">
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

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
          <p className="mt-4 text-slate-500">No published services in this category yet.</p>
        )}
      </div>
    </div>
  );
}
