import { prisma } from "@/lib/db";
import { getSignalType } from "@/lib/taxonomy";
import type { SignalDTO } from "@/lib/types";
import type { Signal, Subscription } from "@prisma/client";
import { cosine, embed } from "@/lib/pipeline/embedding";

export function toDTO(s: Signal): SignalDTO {
  let why: string[] = [];
  try {
    why = JSON.parse(s.whyItMatters);
  } catch {
    why = [];
  }
  return {
    id: s.id,
    type: s.type,
    typeLabel: getSignalType(s.type)?.label ?? s.type,
    category: s.category as "business" | "consumer",
    groupName: s.groupName,
    title: s.title,
    summary: s.summary,
    entityName: s.entityName,
    entityDomain: s.entityDomain,
    entityLocation: s.entityLocation,
    whyItMatters: why,
    confidence: s.confidence,
    suggestedAction: s.suggestedAction,
    sourceUrl: s.sourceUrl,
    rawSource: s.rawSource,
    detectedAt: s.detectedAt.toISOString(),
  };
}

export interface SignalQuery {
  category?: "business" | "consumer";
  type?: string;
  q?: string;
  minConfidence?: number;
  limit?: number;
}

export async function querySignals(query: SignalQuery): Promise<SignalDTO[]> {
  const where: Record<string, unknown> = {};
  if (query.category) where.category = query.category;
  if (query.type) where.type = query.type;
  if (query.minConfidence) where.confidence = { gte: query.minConfidence };
  if (query.q) {
    where.OR = [
      { title: { contains: query.q } },
      { summary: { contains: query.q } },
      { entityName: { contains: query.q } },
    ];
  }

  const rows = await prisma.signal.findMany({
    where,
    orderBy: [{ detectedAt: "desc" }, { confidence: "desc" }],
    take: query.limit ?? 100,
  });
  return rows.map(toDTO);
}

/**
 * Personalized feed for a user: union of their subscriptions, ranked by a blend
 * of recency, confidence, and (optional) semantic similarity to their interests.
 * This is the "Signals For <Name>" experience.
 */
export async function personalizedFeed(userId: string, limit = 100): Promise<SignalDTO[]> {
  const subs = await prisma.subscription.findMany({ where: { userId } });
  if (subs.length === 0) {
    return querySignals({ limit });
  }

  const all = await prisma.signal.findMany({
    orderBy: { detectedAt: "desc" },
    take: 400,
  });

  const matched = all.filter((s) => subs.some((sub) => matchesSubscription(s, sub)));
  const ranked = rankByInterest(matched, subs);
  return ranked.slice(0, limit).map(toDTO);
}

function matchesSubscription(s: Signal, sub: Subscription): boolean {
  if (s.confidence < sub.minConfidence) return false;
  if (sub.category && s.category !== sub.category) return false;
  if (sub.signalType && s.type !== sub.signalType) return false;
  if (sub.keyword) {
    const hay = `${s.title} ${s.summary} ${s.entityName ?? ""}`.toLowerCase();
    if (!hay.includes(sub.keyword.toLowerCase())) return false;
  }
  return true;
}

function rankByInterest(signals: Signal[], subs: Subscription[]): Signal[] {
  const interestVecs = subs
    .map((s) => s.keyword)
    .filter(Boolean)
    .map((k) => embed(k as string));

  return [...signals].sort((a, b) => score(b) - score(a));

  function score(s: Signal): number {
    const ageHrs = (Date.now() - s.detectedAt.getTime()) / 3_600_000;
    const recency = Math.exp(-ageHrs / 72); // ~3 day half-life
    let semantic = 0;
    if (interestVecs.length && s.embedding) {
      try {
        const v = JSON.parse(s.embedding) as number[];
        semantic = Math.max(...interestVecs.map((iv) => cosine(iv, v)));
      } catch {
        semantic = 0;
      }
    }
    return s.confidence * 0.5 + recency * 0.3 + semantic * 0.2;
  }
}
