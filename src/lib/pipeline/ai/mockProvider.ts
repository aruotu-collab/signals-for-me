import type { AIProvider } from "./provider";
import type { RawItem, ExtractedSignal, ExtractedOpportunity, ExtractedRisk } from "@/lib/types";
import { SIGNAL_TAXONOMY, getSignalType } from "@/lib/taxonomy";

// Deterministic, zero-cost provider used for local dev and demos.
// It mimics what the real LLM does: classify -> score -> explain -> recommend,
// using the taxonomy keyword hints. This lets the whole product run offline.
export class MockProvider implements AIProvider {
  name = "mock";

  async extract(item: RawItem): Promise<ExtractedSignal> {
    const text = `${item.title} ${item.content}`.toLowerCase();

    // Score every taxonomy type by how many hints it matches.
    let best: { key: string; score: number } | null = null;
    for (const def of SIGNAL_TAXONOMY) {
      let score = 0;
      for (const hint of def.hints) {
        if (text.includes(hint)) score += hint.length > 6 ? 2 : 1;
      }
      if (score > 0 && (!best || score > best.score)) {
        best = { key: def.key, score };
      }
    }

    if (!best) {
      return {
        isSignal: false,
        type: "none",
        category: "business",
        title: item.title,
        summary: "",
        whyItMatters: [],
        whoBenefits: [],
        whoAtRisk: [],
        affectedIndustries: [],
        opportunities: [],
        risks: [],
        confidence: 0,
      };
    }

    const def = getSignalType(best.key)!;
    const entityName = guessEntity(item.title);
    const confidence = clamp(0.55 + best.score * 0.06, 0, 0.97);

    return {
      isSignal: true,
      type: def.key,
      category: def.category,
      title: synthTitle(def.label, item.title, entityName),
      summary: item.content.slice(0, 240),
      whatChanged: whatChangedFor(def.key, entityName),
      entityName,
      entityLocation: guessLocation(text),
      whyItMatters: reasonsFor(def.key, entityName),
      whoBenefits: whoBenefitsFor(def.key),
      whoAtRisk: whoAtRiskFor(def.key),
      affectedIndustries: industriesFor(def.key),
      opportunities: opportunitiesFor(def.key, confidence),
      risks: risksFor(def.key, confidence),
      confidence: Number(confidence.toFixed(2)),
      suggestedAction: actionFor(def.key),
    };
  }
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function guessEntity(title: string): string | null {
  // crude proper-noun grab: first capitalized run of words
  const m = title.match(/([A-Z][A-Za-z0-9&.]+(?:\s+[A-Z][A-Za-z0-9&.]+){0,3})/);
  return m ? m[1] : null;
}

function guessLocation(text: string): string | null {
  const places = ["london", "manchester", "uk", "lagos", "new york", "berlin", "remote", "leeds", "edinburgh"];
  const hit = places.find((p) => text.includes(p));
  return hit ? hit.replace(/\b\w/g, (c) => c.toUpperCase()) : null;
}

function synthTitle(label: string, original: string, entity: string | null): string {
  if (entity) return original;
  return `${label}: ${original}`;
}

function reasonsFor(key: string, entity: string | null): string[] {
  const who = entity ?? "This organization";
  const map: Record<string, string[]> = {
    funding: ["Likely to buy new software", "Likely to hire aggressively", "Budget freshly available"],
    hiring: ["Active growth phase", "Open to new vendors and tools", "Decision-makers reachable now"],
    buying_intent: ["Actively evaluating solutions", "Short sales cycle window", "Clear budget intent"],
    gov_tender: ["Public budget allocated", "Formal procurement window open", "Qualifying suppliers wanted"],
    expansion: ["Entering new markets", "New operational needs", "Hiring and procurement likely to follow"],
    distress: ["Possible churn or restructuring", "Opportunity for cost-saving offers", "Talent may become available"],
    remote_job: ["Above-market pay", "Open to remote candidates", "Apply early for best odds"],
    travel_deal: ["Unusually low fare", "Limited-time window", "Save significantly vs. average"],
    ai_tool: ["Early-adopter advantage", "Productivity upside", "Trending fast"],
    side_hustle: ["Low barrier to start", "Growing demand", "Monetizable quickly"],
    money: ["Better return than average", "Time-sensitive rate", "Easy to act on"],
    local_event: ["Networking upside", "Near you", "Limited capacity"],
  };
  return map[key] ?? [`${who} shows a clear opportunity signal`, "Worth acting on soon"];
}

function actionFor(key: string): string {
  const map: Record<string, string> = {
    funding: "Reach out within 30 days while budget is fresh.",
    hiring: "Pitch tools/services that support rapid scaling.",
    buying_intent: "Engage now — they are actively evaluating.",
    gov_tender: "Review eligibility and prepare a bid before the deadline.",
    expansion: "Offer market-entry support services.",
    distress: "Lead with cost-reduction or consolidation offers.",
    remote_job: "Apply within 48 hours.",
    travel_deal: "Book before prices normalize.",
    ai_tool: "Try it this week to stay ahead.",
    side_hustle: "Validate with a small first step this weekend.",
    money: "Lock in the rate before it changes.",
    local_event: "Register and add it to your calendar.",
  };
  return map[key] ?? "Review and act while the window is open.";
}

function whatChangedFor(key: string, entity: string | null): string {
  const who = entity ?? "An organization";
  const map: Record<string, string> = {
    funding: `${who} just raised capital and has fresh budget to deploy.`,
    hiring: `${who} is scaling its team quickly.`,
    buying_intent: `${who} is actively shopping for a solution.`,
    gov_tender: "A public body opened a procurement window.",
    expansion: `${who} is entering new markets or locations.`,
    distress: `${who} is under financial or operational pressure.`,
    acquisition: `${who} is consolidating through M&A.`,
    remote_job: "A well-paid remote role just opened.",
    travel_deal: "A fare dropped well below its usual price.",
    ai_tool: "A new AI tool just launched and is gaining traction.",
    side_hustle: "A low-barrier income opportunity is trending.",
    money: "A better-than-average financial rate appeared.",
    local_event: "A relevant event was scheduled nearby.",
  };
  return map[key] ?? `${who} created a new opportunity worth attention.`;
}

function whoBenefitsFor(key: string): string[] {
  const map: Record<string, string[]> = {
    funding: ["Software vendors", "Recruiters", "Consultants", "Office & equipment suppliers"],
    hiring: ["Recruitment agencies", "HR/onboarding tools", "Training providers"],
    buying_intent: ["Solution vendors", "Implementation partners", "Integrators"],
    gov_tender: ["Qualifying suppliers", "Bid-writing consultants", "Subcontractors"],
    expansion: ["Local market advisors", "Logistics providers", "Regional recruiters"],
    distress: ["Restructuring advisors", "Cost-cutting vendors", "Competitors hiring talent"],
    acquisition: ["Integration consultants", "Legal & due-diligence firms"],
    remote_job: ["Job seekers", "Career coaches"],
    travel_deal: ["Travellers", "Travel comparison tools"],
    ai_tool: ["Early adopters", "Agencies reselling the tool", "Course creators"],
    side_hustle: ["Aspiring founders", "Tooling/platform providers"],
    money: ["Savers", "Comparison sites"],
    local_event: ["Attendees", "Local service providers"],
  };
  return map[key] ?? ["Adjacent service providers", "Fast-moving competitors"];
}

function whoAtRiskFor(key: string): string[] {
  const map: Record<string, string[]> = {
    funding: ["Incumbent vendors who may be displaced"],
    hiring: ["Competitors for the same talent"],
    buying_intent: ["Current incumbent supplier"],
    expansion: ["Local incumbents in the new market"],
    distress: ["Employees", "Suppliers owed money", "Existing customers"],
    acquisition: ["Overlapping staff", "Smaller rivals"],
    ai_tool: ["Manual/legacy tooling vendors"],
    travel_deal: ["Full-price competitors"],
  };
  return map[key] ?? [];
}

function industriesFor(key: string): string[] {
  const map: Record<string, string[]> = {
    funding: ["Venture Capital", "SaaS", "Recruitment"],
    hiring: ["Recruitment", "HR Tech"],
    buying_intent: ["Enterprise Software", "Consulting"],
    gov_tender: ["Public Sector", "Professional Services"],
    expansion: ["Logistics", "Commercial Real Estate"],
    distress: ["Corporate Restructuring", "Staffing"],
    acquisition: ["M&A Advisory", "Legal"],
    remote_job: ["Technology", "Remote Work"],
    travel_deal: ["Travel", "Aviation"],
    ai_tool: ["Artificial Intelligence", "Productivity Software"],
    side_hustle: ["Creator Economy", "E-commerce"],
    money: ["Personal Finance", "Banking"],
    local_event: ["Events", "Local Business"],
  };
  return map[key] ?? ["General Business"];
}

function opportunitiesFor(key: string, base: number): ExtractedOpportunity[] {
  const c = (delta: number) => Number(clamp(base + delta, 0.4, 0.97).toFixed(2));
  const map: Record<string, ExtractedOpportunity[]> = {
    funding: [
      { title: "Sell software/services to a newly funded buyer", audience: "business", confidence: c(0) },
      { title: "Offer recruitment support for their hiring push", audience: "business", confidence: c(-0.07) },
      { title: "Apply for newly opening roles", audience: "consumer", confidence: c(-0.12) },
    ],
    hiring: [
      { title: "Provide hiring/onboarding tooling", audience: "business", confidence: c(0) },
      { title: "Apply early to the new openings", audience: "consumer", confidence: c(-0.05) },
    ],
    buying_intent: [
      { title: "Pitch your solution during active evaluation", audience: "business", confidence: c(0.02) },
      { title: "Offer implementation/migration services", audience: "business", confidence: c(-0.06) },
    ],
    gov_tender: [
      { title: "Bid for the public contract", audience: "business", confidence: c(0) },
      { title: "Offer bid-writing/compliance support", audience: "business", confidence: c(-0.08) },
    ],
    expansion: [
      { title: "Provide market-entry & logistics support", audience: "business", confidence: c(0) },
      { title: "New local jobs to apply for", audience: "consumer", confidence: c(-0.1) },
    ],
    distress: [
      { title: "Lead with cost-reduction offers", audience: "business", confidence: c(0) },
      { title: "Hire newly available talent", audience: "business", confidence: c(-0.05) },
    ],
    ai_tool: [
      { title: "Resell or build services on the new tool", audience: "business", confidence: c(0) },
      { title: "Learn it early for a productivity edge", audience: "consumer", confidence: c(-0.04) },
    ],
    travel_deal: [{ title: "Book the discounted fare", audience: "consumer", confidence: c(0) }],
    side_hustle: [{ title: "Start a low-cost side business", audience: "consumer", confidence: c(0) }],
    money: [{ title: "Lock in the improved rate", audience: "consumer", confidence: c(0) }],
    remote_job: [{ title: "Apply to the remote role", audience: "consumer", confidence: c(0) }],
    local_event: [{ title: "Attend to network locally", audience: "consumer", confidence: c(0) }],
  };
  return map[key] ?? [{ title: "Act on this opportunity early", audience: "business", confidence: c(0) }];
}

function risksFor(key: string, base: number): ExtractedRisk[] {
  const c = (delta: number) => Number(clamp(base + delta, 0.4, 0.97).toFixed(2));
  const map: Record<string, ExtractedRisk[]> = {
    funding: [{ title: "Incumbent vendors may be locked in first", confidence: c(-0.1) }],
    buying_intent: [{ title: "Short window before a vendor is chosen", confidence: c(-0.05) }],
    distress: [
      { title: "Counterparty may default on obligations", confidence: c(0) },
      { title: "Talent and customers may churn", confidence: c(-0.08) },
    ],
    expansion: [{ title: "Local incumbents may resist entry", confidence: c(-0.1) }],
    ai_tool: [{ title: "Tool may be immature or hyped", confidence: c(-0.12) }],
    travel_deal: [{ title: "Fare may be an error and get cancelled", confidence: c(-0.1) }],
    gov_tender: [{ title: "Heavy compliance burden to qualify", confidence: c(-0.08) }],
  };
  return map[key] ?? [];
}
