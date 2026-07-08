import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata, hubToSlug } from "@/lib/seo";
import { listMatrixHubs } from "@/lib/shiply";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export const metadata: Metadata = buildPageMetadata({
  title: "UK delivery jobs by area — browse pickup hubs",
  description:
    "Find courier and delivery driver jobs by UK pickup area. London, Manchester, Birmingham, Leeds, Glasgow and more — live Shiply listings on Pickup Radar.",
  path: "/jobs",
  keywords: ["UK delivery jobs by area", "courier jobs by city", "Shiply jobs UK", "pickup hub jobs"],
});

export default async function JobsIndexPage() {
  const hubs = await listMatrixHubs(80);

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold text-white">UK delivery jobs by pickup area</h1>
        <p className="max-w-3xl text-sm text-slate-400">
          Browse open courier and van delivery jobs by where you pick up. Each page lists live job counts and sample
          listings for that hub — then jump into Pickup Radar or the route planner.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {hubs.map((h) => (
          <Link
            key={h.pickupHub}
            href={`/jobs/${hubToSlug(h.pickupHub)}`}
            className="card p-4 transition hover:border-brand-400/30"
          >
            <div className="font-semibold text-white">{h.pickupHub}</div>
            <div className="mt-1 text-sm text-slate-500">{h.count.toLocaleString("en-GB")} jobs</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
