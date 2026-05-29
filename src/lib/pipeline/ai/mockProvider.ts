import type { AIProvider } from "./provider";
import type { RawItem, ExtractedSignal } from "@/lib/types";
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
      entityName,
      entityLocation: guessLocation(text),
      whyItMatters: reasonsFor(def.key, entityName),
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
