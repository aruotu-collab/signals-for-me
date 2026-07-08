import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, buildPageMetadata, hubToSlug, jobListingJsonLd, serviceToSlug } from "@/lib/seo";
import { getHubLandingData, resolveHubSlug } from "@/lib/shiply";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

type Props = { params: Promise<{ hub: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { hub: slug } = await params;
  const hub = await resolveHubSlug(slug);
  if (!hub) return { title: "Hub not found", robots: { index: false } };

  const data = await getHubLandingData(hub);
  return buildPageMetadata({
    title: `Delivery jobs in ${hub} — ${data.total.toLocaleString("en-GB")} open listings`,
    description: `Browse ${data.total.toLocaleString("en-GB")} UK delivery and courier jobs picking up in ${hub}. Cars, furniture, motorcycles and more — sorted by pickup hub on Pickup Radar.`,
    path: `/jobs/${slug}`,
    keywords: [
      `delivery jobs ${hub}`,
      `courier jobs ${hub}`,
      `DeliveryQuoteCompare jobs ${hub}`,
      `van driver jobs ${hub}`,
      "UK delivery jobs",
    ],
  });
}

export default async function HubJobsPage({ params }: Props) {
  const { hub: slug } = await params;
  const hub = await resolveHubSlug(slug);
  if (!hub) notFound();

  const data = await getHubLandingData(hub);

  return (
    <div className="space-y-8">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Jobs by area", path: "/jobs" },
            { name: hub, path: `/jobs/${slug}` },
          ]),
          jobListingJsonLd({
            hub,
            jobCount: data.total,
            sampleTitles: data.sample.map((j) => j.title),
          }),
        ]}
      />

      <header className="space-y-3">
        <nav className="text-xs text-slate-500">
          <Link href="/" className="hover:text-slate-300">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link href="/jobs" className="hover:text-slate-300">
            Jobs by area
          </Link>
          <span className="mx-2">/</span>
          <span className="text-slate-400">{hub}</span>
        </nav>
        <h1 className="text-3xl font-bold text-white">Delivery jobs in {hub}</h1>
        <p className="max-w-3xl text-sm text-slate-400">
          {data.total.toLocaleString("en-GB")} open UK delivery jobs with pickup in{" "}
          <strong className="font-medium text-slate-300">{hub}</strong>. Scan them on Pickup Radar, plan a route from
          this hub, or open a job on DeliveryQuoteCompare to quote.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/matrix" className="btn-primary px-4 py-2 text-sm">
            Open Pickup Radar
          </Link>
          <Link href={`/planner?from=${encodeURIComponent(hub)}`} className="btn-ghost px-4 py-2 text-sm">
            Plan route from {hub}
          </Link>
        </div>
      </header>

      {data.services.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-white">Job types in {hub}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {data.services.map((s) => (
              <Link
                key={s.service}
                href={`/delivery-jobs/${serviceToSlug(s.service)}`}
                className="chip bg-white/5 text-slate-300 hover:bg-brand-500/15 hover:text-brand-200"
              >
                {s.service} · {s.count}
              </Link>
            ))}
          </div>
        </section>
      )}

      {data.sample.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-white">Latest jobs picking up in {hub}</h2>
          <p className="mt-1 text-xs text-slate-500">Nearest drop-offs first — updated when listings are refreshed.</p>
          <ul className="mt-4 space-y-2">
            {data.sample.map((job) => (
              <li key={job.shiplyKey}>
                <a
                  href={job.shiplyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:border-brand-400/30"
                >
                  <div className="text-sm font-medium text-white">{job.title}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {job.pickupTown} → {job.deliveryTown}
                    {job.miles != null && ` · ${job.miles} mi`}
                    {job.quotes != null && ` · ${job.quotes} quotes`}
                    <span className="text-slate-600"> · {job.service}</span>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card p-5 text-sm text-slate-400">
        <h2 className="font-semibold text-white">Drivers in {hub}</h2>
        <p className="mt-2">
          Use <Link href="/matrix" className="text-brand-300 underline">Pickup Radar</Link> to see every job for your
          service types, with fuel cost and profit estimates. Save favourites and track won jobs in{" "}
          <Link href="/favourites" className="text-brand-300 underline">My Jobs</Link>.
        </p>
      </section>
    </div>
  );
}
