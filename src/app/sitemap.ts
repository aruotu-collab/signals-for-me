import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/ideas`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/need`, changeFrequency: "daily", priority: 0.95 },
    { url: `${SITE_URL}/submit`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/pricing`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.3 },
  ];

  try {
    const ideas = await prisma.demandIdea.findMany({
      select: { id: true, createdAt: true },
      where: { status: "active" },
      orderBy: { createdAt: "desc" },
      take: 5000,
    });
    const ideaEntries: MetadataRoute.Sitemap = ideas.map((i) => ({
      url: `${SITE_URL}/ideas/${i.id}`,
      lastModified: i.createdAt,
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    const intents = await prisma.intentCampaign.findMany({
      where: { status: "published" },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 5000,
    });
    const intentEntries: MetadataRoute.Sitemap = intents.map((c) => ({
      url: `${SITE_URL}/need/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: "weekly",
      priority: 0.85,
    }));

    return [...staticEntries, ...intentEntries, ...ideaEntries];
  } catch {
    return staticEntries;
  }
}
