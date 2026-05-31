import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

// Dynamic sitemap: static pages plus every signal detail page, so each detected
// opportunity becomes an indexable landing page.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/feed`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/areas`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/pricing`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.3 },
  ];

  try {
    const signals = await prisma.signal.findMany({
      select: { id: true, detectedAt: true },
      orderBy: { detectedAt: "desc" },
      take: 5000,
    });
    const signalEntries: MetadataRoute.Sitemap = signals.map((s) => ({
      url: `${SITE_URL}/signals/${s.id}`,
      lastModified: s.detectedAt,
      changeFrequency: "weekly",
      priority: 0.7,
    }));
    return [...staticEntries, ...signalEntries];
  } catch {
    return staticEntries;
  }
}
