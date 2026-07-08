import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { buildPageMetadata, serviceToSlug } from "@/lib/seo";
import { listMatrixServices } from "@/lib/shiply";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export const metadata: Metadata = buildPageMetadata({
  title: "UK delivery job types — cars, furniture, motorcycles & more",
  description:
    "Browse UK courier jobs by category: cars, motorcycles, furniture, pianos, haulage, removals and more. Live Shiply listings with pickup hubs and route planning.",
  path: "/delivery-jobs",
  keywords: ["car delivery jobs UK", "motorcycle transport jobs", "furniture delivery courier", "Shiply categories"],
});

export default async function DeliveryJobsIndexPage() {
  const services = await listMatrixServices();
  const counts = await Promise.all(
    services.map(async (s) => {
      const count = await prisma.shiplyJob.count({ where: { service: s.service } });
      return { ...s, count };
    }),
  );

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold text-white">UK delivery jobs by type</h1>
        <p className="max-w-3xl text-sm text-slate-400">
          Courier and van work grouped by what you&apos;re moving — from cars and motorcycles to furniture, pianos, and
          haulage. Each category page shows live job counts and top pickup hubs.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {counts
          .sort((a, b) => b.count - a.count)
          .map((s) => (
            <Link
              key={s.service}
              href={`/delivery-jobs/${serviceToSlug(s.service)}`}
              className="card p-4 transition hover:border-brand-400/30"
            >
              <div className="font-semibold text-white">{s.service}</div>
              <div className="mt-1 text-sm text-slate-500">{s.count.toLocaleString("en-GB")} jobs · {s.serviceType}</div>
            </Link>
          ))}
      </div>
    </div>
  );
}
