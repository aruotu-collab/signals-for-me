import { prisma } from "@/lib/db";
import {
  DEMAND_CATEGORIES,
  categoryIcon,
  categoryLabel,
  type DemandCategoryKey,
} from "@/lib/demandCategories";

export { DEMAND_CATEGORIES, categoryIcon, categoryLabel };
export type DemandCategory = DemandCategoryKey;

// Vote weights for the Demand Score.
export const VOTE_WEIGHTS: Record<string, number> = {
  like: 1,
  need: 2,
  would_pay: 5,
  local: 3,
  waitlist: 10,
};

export type VoteKind = "like" | "need" | "would_pay" | "local" | "waitlist";

export interface GeoStats {
  countries: { location: string; count: number }[];
  regions: { location: string; count: number }[];
  areas: { location: string; count: number }[];
  /** @deprecated use regions */
  cities: { location: string; count: number }[];
  legacy: { location: string; count: number }[];
}

export interface DemandStats {
  demandScore: number;
  strength: "Low" | "Moderate" | "High" | "Very High";
  growth7d: number;
  voteCounts: Record<string, number>;
  commentCount: number;
  topPriceBand: string | null;
  topFrequency: string | null;
  topUrgency: string | null;
  geo: GeoStats;
  geoBreakdown: { location: string; count: number }[];
  demographics: {
    ageRanges: { label: string; count: number }[];
    incomeBands: { label: string; count: number }[];
    parents: number;
    homeowners: number;
  };
}

export function computeDemandScore(voteCounts: Record<string, number>): number {
  return Object.entries(voteCounts).reduce(
    (sum, [kind, count]) => sum + (VOTE_WEIGHTS[kind] ?? 1) * count,
    0,
  );
}

export function demandStrength(score: number): DemandStats["strength"] {
  if (score >= 5000) return "Very High";
  if (score >= 1500) return "High";
  if (score >= 400) return "Moderate";
  return "Low";
}

type VoteRow = {
  kind: string;
  priceBand: string | null;
  frequency: string | null;
  urgency: string | null;
  postcode: string | null;
  postcodeDistrict: string | null;
  locationCountry: string | null;
  locationRegion: string | null;
  locationCity: string | null;
  locationArea: string | null;
  createdAt: Date;
  user: {
    ageRange: string | null;
    incomeBand: string | null;
    isParent: boolean | null;
    isHomeowner: boolean | null;
    postcode: string | null;
    postcodeDistrict: string | null;
    locationCountry: string | null;
    locationRegion: string | null;
    locationCity: string | null;
    locationArea: string | null;
  } | null;
};

type LocationFields = {
  postcode: string | null;
  postcodeDistrict: string | null;
  locationCountry: string | null;
  locationRegion: string | null;
  locationCity: string | null;
  locationArea: string | null;
};

function pickLocation(v: VoteRow, ideaLocation?: string | null): LocationFields & { enriched: boolean } {
  const fromVote: LocationFields = {
    postcode: v.postcode,
    postcodeDistrict: v.postcodeDistrict,
    locationCountry: v.locationCountry,
    locationRegion: v.locationRegion,
    locationCity: v.locationCity,
    locationArea: v.locationArea,
  };
  const fromUser: LocationFields = {
    postcode: v.user?.postcode ?? null,
    postcodeDistrict: v.user?.postcodeDistrict ?? null,
    locationCountry: v.user?.locationCountry ?? null,
    locationRegion: v.user?.locationRegion ?? null,
    locationCity: v.user?.locationCity ?? null,
    locationArea: v.user?.locationArea ?? null,
  };

  const merged: LocationFields = {
    postcode: fromVote.postcode ?? fromUser.postcode,
    postcodeDistrict: fromVote.postcodeDistrict ?? fromUser.postcodeDistrict,
    locationCountry: fromVote.locationCountry ?? fromUser.locationCountry,
    locationRegion: fromVote.locationRegion ?? fromUser.locationRegion,
    locationCity: fromVote.locationCity ?? fromUser.locationCity,
    locationArea: fromVote.locationArea ?? fromUser.locationArea,
  };

  const enriched = Boolean(merged.locationCountry && merged.locationRegion && merged.locationArea);
  if (!enriched && !merged.postcode && ideaLocation) {
    return {
      postcode: null,
      postcodeDistrict: null,
      locationCountry: ideaLocation === "UK-wide" ? "United Kingdom" : null,
      locationRegion: null,
      locationCity: ideaLocation === "UK-wide" ? null : ideaLocation,
      locationArea: null,
      enriched: false,
    };
  }

  return { ...merged, enriched };
}

function areaLabel(loc: LocationFields): string | null {
  if (!loc.locationArea) return loc.locationCity;
  if (loc.locationCity && loc.locationCity !== loc.locationArea) {
    return `${loc.locationArea}, ${loc.locationCity}`;
  }
  return loc.locationArea;
}

function legacyAreaLabel(postcode: string | null, ideaLocation?: string | null): string {
  if (postcode) return legacyCityFromPostcode(postcode);
  if (ideaLocation && ideaLocation !== "UK-wide") return ideaLocation;
  return "Unknown";
}

function legacyCityFromPostcode(postcode: string): string {
  const known: Record<string, string> = {
    SW: "London",
    SE: "London",
    E: "London",
    N: "London",
    W: "London",
    NW: "London",
    EC: "London",
    WC: "London",
    M: "Manchester",
    B: "Birmingham",
    L: "Liverpool",
    LS: "Leeds",
    G: "Glasgow",
    EH: "Edinburgh",
    BS: "Bristol",
    CF: "Cardiff",
  };
  const prefix = postcode.replace(/\s/g, "").toUpperCase().match(/^[A-Z]+/)?.[0] ?? "";
  return known[prefix] ?? postcode.split(" ")[0] ?? "Other";
}

function topRows(obj: Record<string, number>, limit = 8) {
  return Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([location, count]) => ({ location, count }));
}

export function aggregateDemandStats(
  votes: VoteRow[],
  commentCount: number,
  location?: string | null,
): DemandStats {
  const voteCounts: Record<string, number> = {};
  const priceBands: Record<string, number> = {};
  const frequencies: Record<string, number> = {};
  const urgencies: Record<string, number> = {};
  const countries: Record<string, number> = {};
  const regions: Record<string, number> = {};
  const areas: Record<string, number> = {};
  const legacy: Record<string, number> = {};
  const ageRanges: Record<string, number> = {};
  const incomeBands: Record<string, number> = {};
  let parents = 0;
  let homeowners = 0;

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  let recentCount = 0;
  let olderCount = 0;

  for (const v of votes) {
    voteCounts[v.kind] = (voteCounts[v.kind] ?? 0) + 1;
    if (v.priceBand) priceBands[v.priceBand] = (priceBands[v.priceBand] ?? 0) + 1;
    if (v.frequency) frequencies[v.frequency] = (frequencies[v.frequency] ?? 0) + 1;
    if (v.urgency) urgencies[v.urgency] = (urgencies[v.urgency] ?? 0) + 1;

    const loc = pickLocation(v, location);
    if (loc.enriched) {
      if (loc.locationCountry) countries[loc.locationCountry] = (countries[loc.locationCountry] ?? 0) + 1;
      if (loc.locationRegion) regions[loc.locationRegion] = (regions[loc.locationRegion] ?? 0) + 1;
      const area = areaLabel(loc);
      if (area) areas[area] = (areas[area] ?? 0) + 1;
    } else {
      const label = legacyAreaLabel(loc.postcode, location);
      legacy[label] = (legacy[label] ?? 0) + 1;
      if (loc.locationCountry) countries[loc.locationCountry] = (countries[loc.locationCountry] ?? 0) + 1;
    }

    if (v.user?.ageRange) ageRanges[v.user.ageRange] = (ageRanges[v.user.ageRange] ?? 0) + 1;
    if (v.user?.incomeBand) incomeBands[v.user.incomeBand] = (incomeBands[v.user.incomeBand] ?? 0) + 1;
    if (v.user?.isParent) parents++;
    if (v.user?.isHomeowner) homeowners++;

    if (v.createdAt.getTime() >= sevenDaysAgo) recentCount++;
    else olderCount++;
  }

  const demandScore = computeDemandScore(voteCounts);
  const growth7d = olderCount > 0 ? Math.round(((recentCount - olderCount) / olderCount) * 100) : recentCount > 0 ? 100 : 0;

  const top = (obj: Record<string, number>) =>
    Object.entries(obj).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const geo: GeoStats = {
    countries: topRows(countries),
    regions: topRows(regions),
    areas: topRows(areas),
    cities: topRows(regions),
    legacy: topRows(legacy),
  };

  return {
    demandScore,
    strength: demandStrength(demandScore),
    growth7d,
    voteCounts,
    commentCount,
    topPriceBand: top(priceBands),
    topFrequency: top(frequencies),
    topUrgency: top(urgencies),
    geo,
    geoBreakdown: geo.areas.length > 0 ? geo.areas : geo.legacy,
    demographics: {
      ageRanges: Object.entries(ageRanges)
        .sort((a, b) => b[1] - a[1])
        .map(([label, count]) => ({ label, count })),
      incomeBands: Object.entries(incomeBands)
        .sort((a, b) => b[1] - a[1])
        .map(([label, count]) => ({ label, count })),
      parents,
      homeowners,
    },
  };
}

export async function getDemandIdeas(options?: {
  category?: string;
  sort?: "trending" | "score" | "new";
  limit?: number;
  offset?: number;
}) {
  const ideas = await prisma.demandIdea.findMany({
    where: { status: "active", ...(options?.category ? { category: options.category } : {}) },
    include: {
      votes: { include: { user: true } },
      comments: true,
      createdBy: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    skip: options?.offset ?? 0,
    take: options?.limit ?? 50,
  });

  const enriched = ideas.map((idea) => ({
    ...idea,
    stats: aggregateDemandStats(idea.votes, idea.comments.length, idea.location),
  }));

  if (options?.sort === "score") {
    enriched.sort((a, b) => b.stats.demandScore - a.stats.demandScore);
  } else if (options?.sort === "trending") {
    enriched.sort((a, b) => b.stats.growth7d - a.stats.growth7d || b.stats.demandScore - a.stats.demandScore);
  }

  return enriched;
}

export async function countDemandIdeas(category?: string) {
  return prisma.demandIdea.count({
    where: { status: "active", ...(category ? { category } : {}) },
  });
}

export async function getDemandIdea(id: string) {
  const idea = await prisma.demandIdea.findUnique({
    where: { id },
    include: {
      votes: { include: { user: true } },
      comments: { include: { user: { select: { name: true, email: true } } }, orderBy: { createdAt: "desc" } },
      createdBy: { select: { name: true, email: true } },
    },
  });
  if (!idea) return null;
  return { ...idea, stats: aggregateDemandStats(idea.votes, idea.comments.length, idea.location) };
}

export async function getDashboardSummary() {
  const ideas = await getDemandIdeas({ limit: 100 });
  const totalVotes = ideas.reduce((s, i) => s + i.votes.length, 0);
  const totalIdeas = ideas.length;
  const topDemands = [...ideas].sort((a, b) => b.stats.demandScore - a.stats.demandScore).slice(0, 10);
  const trending = [...ideas].sort((a, b) => b.stats.growth7d - a.stats.growth7d).slice(0, 5);
  const unserved = ideas.filter((i) => i.source === "user").sort((a, b) => b.stats.demandScore - a.stats.demandScore).slice(0, 5);

  const categoryTotals: Record<string, number> = {};
  for (const idea of ideas) {
    categoryTotals[idea.category] = (categoryTotals[idea.category] ?? 0) + idea.stats.demandScore;
  }
  const topCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([key, score]) => ({ key, label: categoryLabel(key), score }));

  return { totalVotes, totalIdeas, topDemands, trending, unserved, topCategories };
}

export function formatPriceBand(band: string | null): string {
  if (!band) return "—";
  if (band === "40+") return "£40+";
  return `£${band}`;
}

export function formatFrequency(freq: string | null): string {
  const map: Record<string, string> = {
    weekly: "Weekly",
    monthly: "Monthly",
    quarterly: "Quarterly",
    once: "Once",
  };
  return freq ? (map[freq] ?? freq) : "—";
}

export function formatUrgency(urgency: string | null): string {
  const map: Record<string, string> = {
    nice: "Nice to have",
    useful: "Useful",
    urgent: "Need now",
  };
  return urgency ? (map[urgency] ?? urgency) : "—";
}

export function estimateRevenue(stats: DemandStats, avgPrice = 25): { low: number; high: number } {
  const payers = stats.voteCounts.would_pay ?? 0;
  const waitlist = stats.voteCounts.waitlist ?? 0;
  const monthly = stats.topFrequency === "weekly" ? 4 : stats.topFrequency === "monthly" ? 1 : 0.25;
  const base = (payers + waitlist * 2) * avgPrice * monthly;
  return { low: Math.round(base * 0.6), high: Math.round(base * 1.4) };
}
