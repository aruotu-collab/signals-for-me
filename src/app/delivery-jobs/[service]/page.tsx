import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, buildPageMetadata, hubToSlug, serviceToSlug } from "@/lib/seo";
import { getServiceLandingData, listMatrixServices, resolveServiceSlug } from "@/lib/shiply";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

type Props = { params: Promise<{ service: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { service: slug } = await params;
  const service = await resolveServiceSlug(slug);
  if (!service) return { title: "Category not found", robots: { index: false } };

  const data = await getServiceLandingData(service);
  return buildPageMetadata({
    title: `${service} delivery jobs UK — ${data.total.toLocaleString("en-GB")} listings`,
    description: `Find ${data.total.toLocaleString("en-GB")} ${service.toLowerCase()} delivery jobs across the UK. See top pickup hubs, sample listings, and quote on Shiply.`,
    path: `/delivery-jobs/${slug}`,
    keywords: [`${service} delivery jobs`, `${service} courier jobs UK`, "Shiply jobs", "UK van delivery"],
  });
}

export default async function ServiceJobsPage({ params }: Props) {
  const { service: slug } = await params;
  const service = await resolveServiceSlug(slug);
  if (!service) notFound();

  const data = await getServiceLandingData(service);

  return (
    <div className="space-y-8">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Delivery job types", path: "/delivery-jobs" },
          { name: service, path: `/delivery-jobs/${slug}` },
        ])}
      />

      <header className="space-y-3">
        <nav className="text-xs text-slate-500">
          <Link href="/" className="hover:text-slate-300">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link href="/delivery-jobs" className="hover:text-slate-300">
            Job types
          </Link>
          <span className="mx-2">/</span>
          <span className="text-slate-400">{service}</span>
        </nav>
        <h1 className="text-3xl font-bold text-white">{service} delivery jobs</h1>
        <p className="max-w-3xl text-sm text-slate-400">
          {data.total.toLocaleString("en-GB")} open <strong className="font-medium text-slate-300">{service}</strong>{" "}
          jobs across the UK — browse by pickup hub on Pickup Radar or plan a multi-drop route.
        </p>
        <Link href="/matrix" className="btn-primary inline-flex px-4 py-2 text-sm">
          Open Pickup Radar
        </Link>
      </header>

      {data.hubs.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-white">Top pickup hubs for {service}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {data.hubs.map((h) => (
              <Link
                key={h.hub}
                href={`/jobs/${hubToSlug(h.hub)}`}
                className="chip bg-white/5 text-slate-300 hover:bg-brand-500/15 hover:text-brand-200"
              >
                {h.hub} · {h.count}
              </Link>
            ))}
          </div>
        </section>
      )}

      {data.sample.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-white">Sample {service} jobs</h2>
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
                    {job.pickupHub} · {job.pickupTown} → {job.deliveryTown}
                    {job.miles != null && ` · ${job.miles} mi`}
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export async function generateStaticParams() {
  try {
    const services = await listMatrixServices();
    return services.map((s) => ({ service: serviceToSlug(s.service) }));
  } catch {
    return [];
  }
}
