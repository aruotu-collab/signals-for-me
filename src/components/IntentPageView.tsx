import Link from "next/link";
import { categoryIcon, categoryLabel } from "@/lib/demand";
import { parseFaq } from "@/lib/intent/queries";
import { IntentCallCTA } from "@/components/IntentCallCTA";
import { VotePanel } from "@/components/VotePanel";
import { getCurrentUser } from "@/lib/session";
import { hasCompleteLocation } from "@/lib/location";
import { aggregateDemandStats } from "@/lib/demand";
import { GeoDemandPanel } from "@/components/GeoDemandPanel";

type Campaign = NonNullable<Awaited<ReturnType<typeof import("@/lib/intent/queries").getPublishedCampaign>>>;

export async function IntentPageView({
  campaign,
  related,
}: {
  campaign: Campaign;
  related: { slug: string; h1: string; serviceName: string }[];
}) {
  const user = await getCurrentUser();
  const faqs = parseFaq(campaign.faqJson);
  const idea = campaign.demandIdea;
  const stats = idea
    ? aggregateDemandStats(idea.votes, idea.comments.length, idea.location)
    : null;
  const existingVotes = idea
    ? idea.votes.filter((v) => v.userId === user?.id).map((v) => v.kind)
    : [];

  return (
    <div className="space-y-8">
      <Link href="/need" className="text-sm text-slate-400 hover:text-white">
        ← All intent pages
      </Link>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <header>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-2xl">{categoryIcon(campaign.category)}</span>
              <span className="chip bg-white/5 text-slate-400">{categoryLabel(campaign.category)}</span>
              {campaign.modifierLabel && (
                <span className="chip bg-brand-500/15 text-brand-200">{campaign.modifierLabel}</span>
              )}
              {campaign.locationName && (
                <span className="chip bg-white/5 text-slate-500">📍 {campaign.locationName}</span>
              )}
            </div>
            <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">{campaign.h1}</h1>
          </header>

          <section className="card space-y-5 p-6">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                What is this service?
              </h2>
              <p className="mt-2 text-slate-300">{campaign.whatIsThis}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-white/5 p-4">
                <div className="text-xs text-slate-500">Typical price range</div>
                <div className="mt-1 text-sm font-medium text-white">{campaign.priceRange}</div>
              </div>
              <div className="rounded-xl bg-white/5 p-4">
                <div className="text-xs text-slate-500">How quickly can you get help?</div>
                <div className="mt-1 text-sm font-medium text-white">{campaign.howFast}</div>
              </div>
            </div>
            <IntentCallCTA serviceName={campaign.serviceName} callPhone={campaign.callPhone} />
          </section>

          {faqs.length > 0 && (
            <section className="card p-6">
              <h2 className="text-lg font-semibold text-white">Common questions</h2>
              <dl className="mt-4 space-y-4">
                {faqs.map((f) => (
                  <div key={f.q}>
                    <dt className="font-medium text-slate-200">{f.q}</dt>
                    <dd className="mt-1 text-sm text-slate-400">{f.a}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {idea && (
            <section id="vote" className="card p-5">
              <h2 className="text-lg font-semibold text-white">Show demand in your area</h2>
              <p className="mt-1 text-sm text-slate-400">
                Can&apos;t call right now? Vote to help businesses see unmet demand — same data powers our
                intelligence dashboard.
              </p>
              <div className="mt-4">
                <VotePanel
                  ideaId={idea.id}
                  existingVotes={existingVotes}
                  signedIn={!!user}
                  hasLocation={hasCompleteLocation(user ?? {})}
                  initialLocation={
                    user
                      ? {
                          locationCountry: user.locationCountry ?? undefined,
                          locationRegion: user.locationRegion ?? undefined,
                          locationCity: user.locationCity ?? undefined,
                          locationArea: user.locationArea ?? undefined,
                        }
                      : null
                  }
                />
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-4">
          {stats && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Live demand</h3>
              <div className="mt-3 text-3xl font-bold text-white">{stats.demandScore.toLocaleString()}</div>
              <div className="text-sm text-slate-500">demand score · {stats.strength}</div>
              <div className="mt-4">
                <GeoDemandPanel geo={stats.geo} />
              </div>
            </div>
          )}

          {related.length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Related</h3>
              <ul className="mt-3 space-y-2">
                {related.map((r) => (
                  <li key={r.slug}>
                    <Link href={`/need/${r.slug}`} className="text-sm text-brand-300 hover:underline">
                      {r.h1}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {idea && (
            <Link href={`/ideas/${idea.id}`} className="card block p-5 text-sm text-slate-400 hover:text-white">
              View full demand discussion →
            </Link>
          )}
        </aside>
      </div>
    </div>
  );
}
