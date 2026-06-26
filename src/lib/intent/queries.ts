import { prisma } from "@/lib/db";

export async function getPublishedCampaign(slug: string) {
  return prisma.intentCampaign.findFirst({
    where: { slug, status: "published" },
    include: {
      demandIdea: {
        include: {
          votes: { include: { user: true } },
          comments: true,
        },
      },
    },
  });
}

export async function listPublishedCampaigns(options?: {
  category?: string;
  intentGroup?: string;
  limit?: number;
  offset?: number;
}) {
  return prisma.intentCampaign.findMany({
    where: {
      status: "published",
      ...(options?.category ? { category: options.category } : {}),
      ...(options?.intentGroup ? { intentGroup: options.intentGroup } : {}),
    },
    orderBy: { serviceName: "asc" },
    skip: options?.offset ?? 0,
    take: options?.limit ?? 48,
    include: { demandIdea: { select: { id: true } } },
  });
}

export async function countPublishedCampaigns(filters?: { category?: string; intentGroup?: string }) {
  return prisma.intentCampaign.count({
    where: {
      status: "published",
      ...(filters?.category ? { category: filters.category } : {}),
      ...(filters?.intentGroup ? { intentGroup: filters.intentGroup } : {}),
    },
  });
}

export async function getRelatedCampaigns(campaign: {
  id: string;
  category: string;
  intentGroup: string | null;
}) {
  return prisma.intentCampaign.findMany({
    where: {
      status: "published",
      id: { not: campaign.id },
      OR: [{ category: campaign.category }, { intentGroup: campaign.intentGroup ?? undefined }],
    },
    take: 6,
    orderBy: { updatedAt: "desc" },
  });
}

export async function listPublishedSlugs(limit = 5000) {
  return prisma.intentCampaign.findMany({
    where: { status: "published" },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
}

export async function searchPublishedCampaigns(q: string, limit = 8) {
  const term = q.trim();
  if (!term) return [];

  return prisma.intentCampaign.findMany({
    where: {
      status: "published",
      OR: [
        { serviceName: { contains: term, mode: "insensitive" } },
        { h1: { contains: term, mode: "insensitive" } },
        { slug: { contains: term.replace(/\s+/g, "-").toLowerCase() } },
      ],
    },
    orderBy: { serviceName: "asc" },
    take: limit,
    select: { id: true, slug: true, h1: true, serviceName: true },
  });
}

export function parseFaq(json: string): { q: string; a: string }[] {
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
