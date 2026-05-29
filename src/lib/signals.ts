import { prisma } from "@/lib/db";
import { getSignalType } from "@/lib/taxonomy";
import type { SignalDTO } from "@/lib/types";
import type { Prisma, Subscription } from "@prisma/client";
import { cosine, embed } from "@/lib/pipeline/embedding";

// A Signal row with its opportunities and risks loaded.
export type SignalWithRelations = Prisma.SignalGetPayload<{
  include: { opportunities: true; risks: true };
}>;

const withRelations = { opportunities: true, risks: true } as const;

function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function toDTO(s: SignalWithRelations): SignalDTO {
  return {
    id: s.id,
    type: s.type,
    typeLabel: getSignalType(s.type)?.label ?? s.type,
    category: s.category as "business" | "consumer",
    groupName: s.groupName,
    title: s.title,
    summary: s.summary,
    whatChanged: s.whatChanged,
    entityName: s.entityName,
    entityDomain: s.entityDomain,
    entityLocation: s.entityLocation,
    whyItMatters: parseJsonArray(s.whyItMatters),
    whoBenefits: parseJsonArray(s.whoBenefits),
    whoAtRisk: parseJsonArray(s.whoAtRisk),
    affectedIndustries: parseJsonArray(s.affectedIndustries),
    opportunities: s.opportunities
      .slice()
      .sort((a, b) => b.confidence - a.confidence)
      .map((o) => ({
        title: o.title,
        audience: o.audience as "business" | "consumer",
        confidence: o.confidence,
      })),
    risks: s.risks
      .slice()
      .sort((a, b) => b.confidence - a.confidence)
      .map((r) => ({ title: r.title, confidence: r.confidence })),
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
      { title: { contains: query.q, mode: "insensitive" } },
      { summary: { contains: query.q, mode: "insensitive" } },
      { entityName: { contains: query.q, mode: "insensitive" } },
    ];
  }

  const rows = await prisma.signal.findMany({
    where,
    orderBy: [{ detectedAt: "desc" }, { confidence: "desc" }],
    take: query.limit ?? 100,
    include: withRelations,
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
    include: withRelations,
  });

  const matched = all.filter((s) => subs.some((sub) => matchesSubscription(s, sub)));
  const ranked = rankByInterest(matched, subs);
  return ranked.slice(0, limit).map(toDTO);
}

function matchesSubscription(s: SignalWithRelations, sub: Subscription): boolean {
  if (s.confidence < sub.minConfidence) return false;
  // A signal matches an audience if it's the signal's primary category OR any of
  // its opportunities target that audience (one signal can serve both).
  if (sub.category) {
    const audiences = new Set<string>([s.category, ...s.opportunities.map((o) => o.audience)]);
    if (!audiences.has(sub.category)) return false;
  }
  if (sub.signalType && s.type !== sub.signalType) return false;
  if (sub.keyword) {
    const hay = [
      s.title,
      s.summary,
      s.entityName ?? "",
      ...s.opportunities.map((o) => o.title),
      s.affectedIndustries,
    ]
      .join(" ")
      .toLowerCase();
    if (!hay.includes(sub.keyword.toLowerCase())) return false;
  }
  return true;
}

function rankByInterest(
  signals: SignalWithRelations[],
  subs: Subscription[],
): SignalWithRelations[] {
  const interestVecs = subs
    .map((s) => s.keyword)
    .filter(Boolean)
    .map((k) => embed(k as string));

  return [...signals].sort((a, b) => score(b) - score(a));

  function score(s: SignalWithRelations): number {
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
