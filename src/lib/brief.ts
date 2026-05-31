import { prisma } from "@/lib/db";
import { toDTO } from "@/lib/signals";
import type { SignalDTO } from "@/lib/types";
import {
  getBusinessType,
  translate,
  type GrowthGoal,
  type OpportunityResult,
} from "@/lib/opportunity";

export type Rating = "High" | "Medium" | "Low";

export interface BriefRow {
  signal: SignalDTO;
  relevance: number;
  locationMatch: boolean;
  industryMatch: boolean;
  opportunity: OpportunityResult;
  risk: { title: string; rating: Rating } | null;
  trend: string;
}

export interface BriefInput {
  businessTypeKey: string;
  location: string;
  growthGoal?: GrowthGoal;
  audience?: "business" | "consumer";
  limit?: number;
}

export interface BriefResult {
  rows: BriefRow[];
  /** true when no profile-specific matches were found and we fell back to general signals */
  fallback: boolean;
  totalRevenueLow: number;
  totalRevenueHigh: number;
}

function terms(input: string): string[] {
  return Array.from(
    new Set(
      input
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length > 2),
    ),
  );
}

function rate(confidence: number): Rating {
  if (confidence >= 0.75) return "High";
  if (confidence >= 0.5) return "Medium";
  return "Low";
}

function haystack(s: SignalDTO): string {
  return [
    s.title,
    s.summary,
    s.whatChanged ?? "",
    s.entityName ?? "",
    s.entityLocation ?? "",
    s.typeLabel,
    s.groupName,
    ...s.whyItMatters,
    ...s.whoBenefits,
    ...s.whoAtRisk,
    ...s.affectedIndustries,
    ...s.opportunities.map((o) => o.title),
    ...s.risks.map((r) => r.title),
  ]
    .join(" \u2022 ")
    .toLowerCase();
}

/**
 * Phase 1 deterministic "Business Brief": match signals to a business type +
 * location, then run each through the Opportunity Engine to produce a revenue
 * estimate, recommended action and score. No AI required.
 */
export async function buildBrief(input: BriefInput): Promise<BriefResult> {
  const bt = getBusinessType(input.businessTypeKey);
  const locationTerms = terms(input.location);
  const limit = input.limit ?? 12;

  const rows = await prisma.signal.findMany({
    where: input.audience ? { category: input.audience } : {},
    orderBy: { detectedAt: "desc" },
    take: 400,
    include: { opportunities: true, risks: true },
  });
  const signals = rows.map(toDTO);

  const scored = signals.map((signal) => {
    const hay = haystack(signal);
    const loc = signal.entityLocation?.toLowerCase() ?? "";
    const industryHits = bt.keywords.filter((k) => hay.includes(k)).length;
    const locationHits = locationTerms.filter((t) => hay.includes(t) || loc.includes(t)).length;
    const relevance = industryHits * 1 + locationHits * 1.6;
    return { signal, relevance, industryHits, locationHits };
  });

  const matched = scored.filter((s) => s.relevance > 0);
  const fallback = matched.length === 0;
  const pool = fallback ? scored : matched;

  const ranked = [...pool]
    .map((s) => {
      const ctx = {
        location: input.location,
        growthGoal: input.growthGoal,
        locationMatch: s.locationHits > 0,
        industryMatch: s.industryHits > 0,
      };
      const opportunity = translate(s.signal, bt, ctx);
      return { ...s, opportunity };
    })
    .sort((a, b) => {
      // Rank by opportunity score primarily, then relevance.
      if (b.opportunity.score !== a.opportunity.score) return b.opportunity.score - a.opportunity.score;
      return b.relevance - a.relevance;
    });

  const top = ranked.slice(0, limit);

  const briefRows: BriefRow[] = top.map(({ signal, relevance, industryHits, locationHits, opportunity }) => {
    const topRisk = signal.risks[0] ?? null;
    return {
      signal,
      relevance,
      industryMatch: industryHits > 0,
      locationMatch: locationHits > 0,
      opportunity,
      risk: topRisk
        ? { title: topRisk.title, rating: rate(topRisk.confidence) }
        : signal.whoAtRisk[0]
          ? { title: signal.whoAtRisk[0], rating: rate(signal.confidence) }
          : null,
      trend: signal.groupName || signal.typeLabel,
    };
  });

  const totalRevenueLow = briefRows
    .filter((r) => !r.opportunity.defensive)
    .reduce((sum, r) => sum + r.opportunity.revenueLow, 0);
  const totalRevenueHigh = briefRows
    .filter((r) => !r.opportunity.defensive)
    .reduce((sum, r) => sum + r.opportunity.revenueHigh, 0);

  return { rows: briefRows, fallback, totalRevenueLow, totalRevenueHigh };
}
