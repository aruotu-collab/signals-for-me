import type { CatalogIdea } from "@/lib/catalog";
import { categoryLabel } from "@/lib/demandCategories";
import { intentGroupForCategory } from "@/lib/intent/groups";
import { DEFAULT_MODIFIER, type IntentModifier } from "@/lib/intent/modifiers";

const STOP_WORDS = new Set([
  "a", "an", "the", "i", "my", "me", "we", "you", "your", "why", "can", "cant", "cannot",
  "dont", "doesnt", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
  "do", "does", "did", "will", "would", "could", "should", "may", "might", "must", "shall",
  "to", "of", "in", "for", "on", "with", "at", "by", "from", "up", "about", "into", "through",
  "during", "before", "after", "above", "below", "between", "out", "off", "over", "under",
  "again", "further", "then", "once", "here", "there", "when", "where", "who", "whom", "this",
  "that", "these", "those", "am", "or", "and", "but", "if", "because", "as", "until", "while",
  "need", "want", "get", "got", "just", "every", "any", "some", "no", "not", "only", "own",
  "same", "so", "than", "too", "very", "still", "already", "always", "never", "ever",
]);

export interface GeneratedCampaign {
  slug: string;
  serviceName: string;
  modifierSlug: string;
  modifierLabel: string;
  locationSlug: string | null;
  locationName: string | null;
  category: string;
  intentGroup: string;
  intentLevel: string;
  h1: string;
  whatIsThis: string;
  priceRange: string;
  howFast: string;
  metaTitle: string;
  metaDescription: string;
  faqJson: string;
}

/** Turn a pain-point title into a searchable service phrase. */
export function titleToServiceName(title: string): string {
  let t = title.replace(/\?+$/, "").trim();
  t = t.replace(/^why\s+(can'?t|isn't|aren't|don't|doesn't)\s+/i, "");
  t = t.replace(/^why\s+/i, "");
  t = t.replace(/^i\s+(need|want|can't|cannot)\s+(a\s+)?/i, "");
  t = t.replace(/^can\s+(i|someone|anyone)\s+/i, "");
  t = t.replace(/^how\s+do\s+i\s+/i, "");
  if (t.length > 72) t = t.slice(0, 69) + "…";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 72);
}

export function buildCampaignSlug(
  serviceName: string,
  modifier: IntentModifier,
  locationName?: string | null,
  disambiguator?: string,
): string {
  const parts = [modifier.slug !== "near-me" ? modifier.slug : "", slugify(serviceName)];
  if (locationName) parts.push(slugify(locationName));
  if (disambiguator) parts.push(disambiguator.slice(0, 6));
  return parts.filter(Boolean).join("-").replace(/-+/g, "-");
}

const PRICE_BY_GROUP: Record<string, string> = {
  emergency: "£80–£250+ depending on urgency and time of day",
  "home-services": "£50–£300 depending on job size",
  trades: "£60–£150/hour or fixed quote",
  automotive: "£40–£200 depending on repair",
  health: "£50–£250 depending on service",
  beauty: "£25–£120 depending on treatment",
  pets: "£20–£80 per visit",
  events: "£150–£1,500 depending on package",
  "business-services": "£100–£500+ depending on scope",
  education: "£25–£60 per hour",
};

const SPEED_BY_GROUP: Record<string, string> = {
  emergency: "Often within 1–2 hours for emergencies",
  "home-services": "Same-day or next-day in most areas",
  trades: "Often same-week; emergencies faster",
  automotive: "Mobile services often same-day",
  health: "Routine: days to weeks; urgent: same day in cities",
  beauty: "Often within a few days",
  pets: "Same-week for regular services",
  events: "Book 2–8 weeks ahead for peak dates",
  "business-services": "Initial response within 1–2 business days",
  education: "Ongoing weekly slots; first lesson within 1–2 weeks",
};

function buildH1(serviceName: string, modifier: IntentModifier, locationName?: string | null): string {
  const base = modifier.prefix ? `${modifier.prefix} ${serviceName}` : serviceName;
  if (locationName) return `${base} in ${locationName}`;
  if (modifier.slug === "near-me") return `${serviceName} Near Me`;
  return base;
}

function buildFaqs(serviceName: string, modifier: IntentModifier, group: string): { q: string; a: string }[] {
  const faqs = [
    {
      q: `How much does ${serviceName.toLowerCase()} cost?`,
      a: PRICE_BY_GROUP[group] ?? PRICE_BY_GROUP["home-services"],
    },
    {
      q: `How quickly can I get ${serviceName.toLowerCase()}?`,
      a: SPEED_BY_GROUP[group] ?? SPEED_BY_GROUP["home-services"],
    },
    {
      q: `Is ${modifier.label.toLowerCase()} ${serviceName.toLowerCase()} available in my area?`,
      a: "Call now to check live availability with a local professional. If nobody can help, vote on this page — we track unmet demand by area.",
    },
  ];
  return faqs;
}

export function generateCampaignFromIdea(
  idea: Pick<CatalogIdea, "title" | "description" | "category">,
  options?: {
    modifier?: IntentModifier;
    locationName?: string | null;
    slugSuffix?: string;
  },
): GeneratedCampaign {
  const modifier = options?.modifier ?? DEFAULT_MODIFIER;
  const serviceName = titleToServiceName(idea.title);
  const intentGroup = intentGroupForCategory(idea.category, idea.title);
  const locationName = options?.locationName ?? null;
  const slug = buildCampaignSlug(serviceName, modifier, locationName, options?.slugSuffix);
  const h1 = buildH1(serviceName, modifier, locationName);
  const catLabel = categoryLabel(idea.category);
  const whatIsThis = `${serviceName} helps people who are actively looking for ${catLabel.toLowerCase()} services. ${idea.description.split(".")[0]}.`;
  const priceRange = PRICE_BY_GROUP[intentGroup] ?? "Varies — request a quote for your area";
  const howFast = SPEED_BY_GROUP[intentGroup] ?? "Availability depends on your location";
  const metaTitle = `${h1} | Call or Compare | SignalsForMe`;
  const metaDescription = `Looking for ${h1.toLowerCase()}? Typical prices: ${priceRange}. ${howFast}. Call now or vote to show demand in your area.`;
  const faqJson = JSON.stringify(buildFaqs(serviceName, modifier, intentGroup));

  return {
    slug,
    serviceName,
    modifierSlug: modifier.slug,
    modifierLabel: modifier.label,
    locationSlug: locationName ? slugify(locationName) : null,
    locationName,
    category: idea.category,
    intentGroup,
    intentLevel: modifier.intentLevel,
    h1,
    whatIsThis,
    priceRange,
    howFast,
    metaTitle: metaTitle.slice(0, 120),
    metaDescription: metaDescription.slice(0, 160),
    faqJson,
  };
}
