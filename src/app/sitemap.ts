import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { hubToSlug, serviceToSlug } from "@/lib/seo";
import { listMatrixHubs, listMatrixServices } from "@/lib/shiply";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const STATIC_PAGES: MetadataRoute.Sitemap = [
  { url: SITE_URL, changeFrequency: "daily", priority: 1 },
  { url: `${SITE_URL}/matrix`, changeFrequency: "daily", priority: 0.95 },
  { url: `${SITE_URL}/planner`, changeFrequency: "daily", priority: 0.9 },
  { url: `${SITE_URL}/quotes`, changeFrequency: "daily", priority: 0.9 },
  { url: `${SITE_URL}/opportunities`, changeFrequency: "daily", priority: 0.85 },
  { url: `${SITE_URL}/jobs`, changeFrequency: "daily", priority: 0.9 },
  { url: `${SITE_URL}/delivery-jobs`, changeFrequency: "daily", priority: 0.9 },
  { url: `${SITE_URL}/favourites`, changeFrequency: "weekly", priority: 0.5 },
  { url: `${SITE_URL}/van-settings`, changeFrequency: "monthly", priority: 0.4 },
  { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!SITE_URL.startsWith("http")) {
    return STATIC_PAGES;
  }

  try {
    const [hubs, services] = await Promise.all([listMatrixHubs(120), listMatrixServices()]);
    const hubPages = hubs.map((h) => ({
      url: `${SITE_URL}/jobs/${hubToSlug(h.pickupHub)}`,
      changeFrequency: "daily" as const,
      priority: 0.8,
    }));
    const servicePages = services.map((s) => ({
      url: `${SITE_URL}/delivery-jobs/${serviceToSlug(s.service)}`,
      changeFrequency: "daily" as const,
      priority: 0.75,
    }));
    return [...STATIC_PAGES, ...hubPages, ...servicePages];
  } catch {
    return STATIC_PAGES;
  }
}
