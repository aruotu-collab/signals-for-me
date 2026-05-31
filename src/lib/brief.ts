import { prisma } from "@/lib/db";
import { toDTO } from "@/lib/signals";
import type { SignalDTO } from "@/lib/types";

export type Rating = "High" | "Medium" | "Low";

export interface BriefRow {
  signal: SignalDTO;
  /** how strongly the signal matched the business profile (relevance score) */
  relevance: number;
  /** matched the location term(s) */
  locationMatch: boolean;
  /** matched the industry term(s) */
  industryMatch: boolean;
  opportunity: { title: string; rating: Rating } | null;
  risk: { title: string; rating: Rating } | null;
  trend: string;
  profitMove: string | null;
}

export interface BriefInput {
  industry: string;
  location: string;
  audience?: "business" | "consumer";
  limit?: number;
}

export interface BriefResult {
  rows: BriefRow[];
  /** true when no profile-specific matches were found and we fell back to general signals */
  fallback: boolean;
  industryTerms: string[];
  locationTerms: string[];
}

const STOPWORDS = new Set([
  "the", "and", "for", "with", "from", "near", "this", "that", "into", "your",
  "are", "was", "has", "have", "will", "can", "all", "any", "our", "out",
  "business", "company", "practice", "service", "services", "shop", "store",
]);

function terms(input: string): string[] {
  return Array.from(
    new Set(
      input
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length > 2 && !STOPWORDS.has(w)),
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
 * Phase 1 deterministic "Business Brief" matcher. Given an industry + location,
 * scores existing signals by textual relevance and returns an
 * Opportunity / Risk / Trend / Profit-move row for each. No AI required; works
 * on the mock provider. (Phase 2 layers an LLM synthesis on top of this.)
 */
export async function buildBrief(input: BriefInput): Promise<BriefResult> {
  const industryTerms = terms(input.industry);
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
    const industryHits = industryTerms.filter((t) => hay.includes(t)).length;
    const locationHits = locationTerms.filter((t) => hay.includes(t) || loc.includes(t)).length;
    // Location is weighted higher — local relevance is the differentiator.
    const relevance = industryHits * 1 + locationHits * 1.6;
    return { signal, relevance, industryHits, locationHits };
  });

  const matched = scored.filter((s) => s.relevance > 0);
  const fallback = matched.length === 0;

  // Fallback: no profile-specific hits (common with generic demo data) — show
  // the highest-confidence recent signals so the brief still demonstrates value.
  const pool = fallback ? scored : matched;
  const ranked = [...pool].sort((a, b) => {
    if (b.relevance !== a.relevance) return b.relevance - a.relevance;
    return b.signal.confidence - a.signal.confidence;
  });

  const briefRows: BriefRow[] = ranked.slice(0, limit).map(({ signal, relevance, industryHits, locationHits }) => {
    const topOpp = signal.opportunities[0] ?? null;
    const topRisk = signal.risks[0] ?? null;
    return {
      signal,
      relevance,
      industryMatch: industryHits > 0,
      locationMatch: locationHits > 0,
      opportunity: topOpp
        ? { title: topOpp.title, rating: rate(topOpp.confidence) }
        : signal.whoBenefits[0]
          ? { title: signal.whoBenefits[0], rating: rate(signal.confidence) }
          : null,
      risk: topRisk
        ? { title: topRisk.title, rating: rate(topRisk.confidence) }
        : signal.whoAtRisk[0]
          ? { title: signal.whoAtRisk[0], rating: rate(signal.confidence) }
          : null,
      trend: signal.groupName || signal.typeLabel,
      profitMove: signal.suggestedAction ?? signal.whyItMatters[0] ?? null,
    };
  });

  return { rows: briefRows, fallback, industryTerms, locationTerms };
}
