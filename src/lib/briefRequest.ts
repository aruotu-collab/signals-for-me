import { buildBrief, buildConsumerBrief, type BriefResult } from "@/lib/brief";
import {
  computeScoreboard,
  groupByLens,
  type LensGroup,
  type Scoreboard,
} from "@/lib/scoreboard";
import { BUSINESS_TYPES, getLenses, type GrowthGoal } from "@/lib/opportunity";

// Shared resolution for the opportunity workspace. Both /brief (the lens
// workspace) and /summary (the executive scoreboard) need the same context:
// resolve the business/location/goal from the URL or the saved profile, build
// the brief, score it and roll it up into lenses. Keeping this in one place
// means the two pages can never drift out of sync.

const GOALS: GrowthGoal[] = ["leads", "revenue", "locations", "hiring", "partnerships"];

export interface BriefRequestParams {
  business?: string;
  location?: string;
  goal?: string;
  audience?: string;
}

export interface BriefProfileUser {
  businessType?: string | null;
  location?: string | null;
  growthGoal?: string | null;
}

export interface ResolvedBrief {
  /** the business type chosen in the form (may be empty for anonymous) */
  formBusiness: string;
  /** the business type actually used (falls back to "generic" for signed-in users) */
  business: string;
  location: string;
  goal?: GrowthGoal;
  audience?: "business" | "consumer";
  /** signed-in user has no business type — we fell back to generic estimates */
  usingGenericDefault: boolean;
  /** brief was auto-generated from the saved profile (no explicit URL business) */
  fromProfile: boolean;
  /** whether we had enough to run a brief at all */
  hasQuery: boolean;
  btLabel: string;
  lensOptions: { key: string; label: string; comingSoon?: boolean }[];
  lensKeys: string[];
  result: BriefResult | null;
  board: Scoreboard | null;
  lensGroups: LensGroup[];
  /** business/location/goal to carry through links + forms */
  ctxParams: Record<string, string>;
}

export async function resolveBrief(
  sp: BriefRequestParams,
  user: BriefProfileUser | null,
  opts: { limit?: number } = {},
): Promise<ResolvedBrief> {
  const profileBusiness = user?.businessType ?? "";
  const profileLocation = user?.location ?? "";
  const profileGoal = user?.growthGoal ?? "";

  const formBusiness = (sp.business || profileBusiness).trim();
  const location = (sp.location || profileLocation).trim();
  const goalRaw = (sp.goal || profileGoal).trim();
  const goal = (GOALS as string[]).includes(goalRaw) ? (goalRaw as GrowthGoal) : undefined;
  const audience =
    sp.audience === "consumer" ? "consumer" : sp.audience === "business" ? "business" : undefined;

  // Consumer track: same engine, person-framed. No business type / catchment.
  if (audience === "consumer") {
    const result = await buildConsumerBrief({ limit: opts.limit ?? 12 });
    const lensOptions = getLenses("consumer");
    const board = computeScoreboard(result.rows);
    const lensGroups = groupByLens(result.rows, lensOptions);
    const ctxParams: Record<string, string> = { audience: "consumer" };
    if (location) ctxParams.location = location;
    return {
      formBusiness: "",
      business: "",
      location,
      goal,
      audience,
      usingGenericDefault: false,
      fromProfile: false,
      hasQuery: true,
      btLabel: "you",
      lensOptions,
      lensKeys: lensOptions.map((l) => l.key),
      result,
      board,
      lensGroups,
      ctxParams,
    };
  }

  const usingGenericDefault = !formBusiness && !!user;
  const business = formBusiness || (usingGenericDefault ? "generic" : "");
  const hasQuery = business.length > 0;
  const fromProfile = !sp.business && !!profileBusiness;

  const result = hasQuery
    ? await buildBrief({
        businessTypeKey: business,
        location,
        growthGoal: goal,
        audience,
        limit: opts.limit ?? 12,
      })
    : null;

  const btLabel = usingGenericDefault
    ? "your business"
    : BUSINESS_TYPES.find((b) => b.key === business)?.label ?? "Your business";

  const lensOptions = getLenses("business");
  const lensKeys = lensOptions.map((l) => l.key);
  const board = result ? computeScoreboard(result.rows) : null;
  const lensGroups = result ? groupByLens(result.rows, lensOptions) : [];

  const ctxParams: Record<string, string> = {};
  if (sp.business || formBusiness) ctxParams.business = business;
  if (location) ctxParams.location = location;
  if (goal) ctxParams.goal = goal;

  return {
    formBusiness,
    business,
    location,
    goal,
    audience,
    usingGenericDefault,
    fromProfile,
    hasQuery,
    btLabel,
    lensOptions,
    lensKeys,
    result,
    board,
    lensGroups,
    ctxParams,
  };
}
