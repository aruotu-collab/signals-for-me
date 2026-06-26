import Link from "next/link";
import { notFound } from "next/navigation";
import { CommentForm } from "@/components/CommentForm";
import { DemandMeter } from "@/components/DemandMeter";
import { GeoDemandPanel } from "@/components/GeoDemandPanel";
import { VotePanel } from "@/components/VotePanel";
import { getCurrentUser } from "@/lib/session";
import { hasCompleteLocation } from "@/lib/location";
import {
  categoryIcon,
  categoryLabel,
  formatFrequency,
  formatPriceBand,
  formatUrgency,
  getDemandIdea,
} from "@/lib/demand";

export const dynamic = "force-dynamic";

export default async function IdeaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idea = await getDemandIdea(id);
  if (!idea) notFound();

  const user = await getCurrentUser();
  const existingVotes = idea.votes.filter((v) => v.userId === user?.id).map((v) => v.kind);
  const totalVotes = Object.values(idea.stats.voteCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-8">
      <Link href="/ideas" className="text-sm text-slate-400 hover:text-white">
        ← Back to ideas
      </Link>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-2xl">{categoryIcon(idea.category)}</span>
              <span className="chip bg-white/5 text-slate-400">{categoryLabel(idea.category)}</span>
              {idea.location && <span className="chip bg-white/5 text-slate-500">📍 {idea.location}</span>}
              {idea.source === "user" && <span className="chip bg-purple-500/15 text-purple-200">Community submitted</span>}
            </div>
            <h1 className="mt-3 text-3xl font-bold text-white">{idea.title}</h1>
            <p className="mt-3 text-lg text-slate-300">{idea.description}</p>
          </div>

          <section className="card p-5">
            <h2 className="text-lg font-semibold text-white">Cast your vote</h2>
            <p className="mt-1 text-sm text-slate-400">Your vote helps businesses know what to build next.</p>
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

          <section className="card p-5">
            <h2 className="text-lg font-semibold text-white">
              Comments <span className="text-slate-500">({idea.comments.length})</span>
            </h2>
            <div className="mt-4">
              <CommentForm ideaId={idea.id} signedIn={!!user} />
            </div>
            <div className="mt-6 space-y-4">
              {idea.comments.map((c) => (
                <div key={c.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                  <div className="text-sm font-medium text-slate-300">
                    {c.user?.name ?? c.user?.email?.split("@")[0] ?? "Anonymous"}
                  </div>
                  <p className="mt-1 text-sm text-slate-400">{c.body}</p>
                </div>
              ))}
              {idea.comments.length === 0 && (
                <p className="text-sm text-slate-500">No comments yet. Be the first to share why you want this.</p>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <div className="card p-5">
            <DemandMeter stats={idea.stats} />
            <div className="mt-4 grid grid-cols-2 gap-3 text-center">
              <Stat label="Total votes" value={totalVotes.toLocaleString()} />
              <Stat label="Comments" value={String(idea.stats.commentCount)} />
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Demand signals</h3>
            <dl className="mt-3 space-y-2 text-sm">
              {Object.entries(idea.stats.voteCounts).map(([kind, count]) => (
                <div key={kind} className="flex justify-between">
                  <dt className="text-slate-400 capitalize">{kind.replace(/_/g, " ")}</dt>
                  <dd className="font-medium text-white">{count}</dd>
                </div>
              ))}
            </dl>
          </div>

          {(idea.stats.topPriceBand || idea.stats.topFrequency || idea.stats.topUrgency) && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Pricing insights</h3>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-400">Avg. price willing</dt>
                  <dd className="text-white">{formatPriceBand(idea.stats.topPriceBand)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-400">Usage frequency</dt>
                  <dd className="text-white">{formatFrequency(idea.stats.topFrequency)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-400">Urgency</dt>
                  <dd className="text-white">{formatUrgency(idea.stats.topUrgency)}</dd>
                </div>
              </dl>
            </div>
          )}

          {(idea.stats.geo.countries.length > 0 ||
            idea.stats.geo.regions.length > 0 ||
            idea.stats.geo.areas.length > 0 ||
            idea.stats.geo.legacy.length > 0) && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Demand by location</h3>
              <div className="mt-3">
                <GeoDemandPanel geo={idea.stats.geo} />
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/5 p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-lg font-bold text-white">{value}</div>
    </div>
  );
}
