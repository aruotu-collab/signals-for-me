import type { RawItem } from "@/lib/types";
import { assertSafeFeedUrl } from "@/lib/security/urlGuard";

// First real public data source: UK planning applications.
//
// Source: planning.data.gov.uk — the official MHCLG Planning Data platform
// (Open Government Licence v3.0). It exposes a key-free JSON API covering
// planning applications across England. We pull recent applications, keep the
// ones that describe NEW HOMES (so each becomes a "new resident" opportunity
// for local businesses), and hand them to the same fetch -> AI -> dedup -> store
// pipeline used by every other source.
//
// Honest limitation: the national dataset is still in beta — structured
// dwelling counts and addresses are incomplete, so we parse the home count and
// any location straight out of the free-text proposal description. London-only
// upgrade path: the GLA "Planning London DataHub" has structured unit counts
// and borough fields, but requires registering for an API key.
// Pull a wide window (residential schemes with explicit unit counts are sparse
// in the national beta dataset) and keep the first `limit` that qualify.
const PLANNING_API =
  "https://www.planning.data.gov.uk/entity.json?dataset=planning-application&limit=500";

// Keep only genuine residential development (e.g. "Erection of 12 dwellings"),
// not loft conversions or extensions "to a dwelling".
const RESIDENTIAL_COUNT =
  /\b\d{1,5}\s*(?:no\.?\s*)?(?:new\s+|additional\s+|self[-\s]contained\s+)?(?:dwellings?|homes?|flats?|apartments?|residential\s+units?)\b/i;
const RESIDENTIAL_THEME =
  /residential\s+development|build[-\s]to[-\s]rent|affordable\s+homes|new\s+homes|housing\s+development|residential\s+led/i;

interface PlanningEntity {
  entity?: number;
  reference?: string;
  name?: string;
  description?: string;
  "address-text"?: string;
  "decision-date"?: string;
  "start-date"?: string;
  "entry-date"?: string;
  "documentation-url"?: string;
}

export async function fetchPlanningItems(limit = 20): Promise<RawItem[]> {
  // Defense in depth: even though the URL is a fixed, trusted endpoint, run it
  // through the same SSRF guard every other source uses.
  let safeUrl: string;
  try {
    safeUrl = await assertSafeFeedUrl(PLANNING_API);
  } catch (err) {
    console.warn(`Planning source skipped: ${(err as Error).message}`);
    return [];
  }

  let entities: PlanningEntity[] = [];
  try {
    const res = await fetch(safeUrl, {
      headers: {
        "User-Agent": "SignalsForMe/0.1 (+https://signalsforme.com)",
        Accept: "application/json",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
      next: { revalidate: 3600 },
    } as RequestInit);
    if (!res.ok) return [];
    const json = (await res.json()) as { entities?: PlanningEntity[] };
    entities = Array.isArray(json.entities) ? json.entities : [];
  } catch {
    return [];
  }

  const items: RawItem[] = [];
  for (const e of entities) {
    const desc = clean(e.description);
    if (!desc) continue;
    if (!(RESIDENTIAL_COUNT.test(desc) || RESIDENTIAL_THEME.test(desc))) continue;

    const location = clean(e["address-text"]) || clean(e.name);
    const date = e["decision-date"] || e["start-date"] || e["entry-date"] || "";
    const ref = e.reference || (e.entity != null ? String(e.entity) : "");

    const parts = [desc];
    if (location) parts.push(`Location: ${location}.`);
    // Note: intentionally no standalone "UK" token here — the mock locator would
    // otherwise tag every application with the location "Uk".
    parts.push(
      `Planning application${ref ? ` (ref ${ref})` : ""}${date ? `, decided ${date}` : ""}.`,
    );

    items.push({
      title: buildTitle(desc, location),
      content: parts.join(" "),
      url: e.entity != null ? `https://www.planning.data.gov.uk/entity/${e.entity}` : undefined,
      source: "gov",
      publishedAt: date || undefined,
    });
    if (items.length >= limit) break;
  }

  return items;
}

function clean(s?: string | null): string {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

function buildTitle(desc: string, location: string): string {
  let t = desc;
  if (t.length > 110) {
    t = t.slice(0, 107).replace(/[\s,;:.]+\S*$/, "") + "…";
  }
  t = t.charAt(0).toUpperCase() + t.slice(1);
  if (location) t = `${t} — ${location.split(",")[0].trim()}`;
  return t;
}
