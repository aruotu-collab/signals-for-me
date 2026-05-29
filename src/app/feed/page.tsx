import { Filters } from "@/components/Filters";
import { SignalCard } from "@/components/SignalCard";
import { IngestButton } from "@/components/IngestButton";
import { querySignals, personalizedFeed } from "@/lib/signals";
import { groupedTaxonomy } from "@/lib/taxonomy";
import { getDemoUser } from "@/lib/demo";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

function str(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function FeedPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const view = str(sp.view);
  const category = str(sp.category) as "business" | "consumer" | undefined;
  const type = str(sp.type);
  const q = str(sp.q);
  const minConfidence = sp.minConfidence ? Number(str(sp.minConfidence)) : 0.5;

  const groups = groupedTaxonomy(category);

  let signals;
  let personalized = false;
  if (view === "me") {
    const user = await getDemoUser();
    if (user) {
      signals = await personalizedFeed(user.id);
      personalized = true;
    } else {
      signals = await querySignals({ category, type, q, minConfidence });
    }
  } else {
    signals = await querySignals({ category, type, q, minConfidence });
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {personalized ? "Signals For Nelson" : "Signal Feed"}
          </h1>
          <p className="text-sm text-slate-400">
            {personalized
              ? "Personalized to your subscriptions, ranked by confidence + recency."
              : "Live opportunities detected across funding, hiring, government, careers, AI & more."}
          </p>
        </div>
        <IngestButton />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[260px_1fr]">
        <Filters groups={groups} />

        <section>
          <div className="mb-3 text-sm text-slate-400">{signals.length} signals</div>
          {signals.length === 0 ? (
            <div className="card p-10 text-center text-slate-400">
              No signals yet. Click <span className="text-brand-300">Scan for signals</span> to run the pipeline.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {signals.map((s) => (
                <SignalCard key={s.id} signal={s} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
