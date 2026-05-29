import type { AIProvider } from "./provider";
import { ExtractedSignalSchema, type RawItem, type ExtractedSignal } from "@/lib/types";
import { SIGNAL_TAXONOMY } from "@/lib/taxonomy";

// Real LLM provider. Activated when AI_PROVIDER=openai and OPENAI_API_KEY is set.
// Uses the Chat Completions JSON mode for reliable structured output. No SDK
// dependency — plain fetch keeps the install light and swappable.
export class OpenAIProvider implements AIProvider {
  name = "openai";
  private model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  async extract(item: RawItem): Promise<ExtractedSignal> {
    const typeList = SIGNAL_TAXONOMY.map((t) => `${t.key} (${t.label}, ${t.category})`).join("\n");

    const system = [
      "You are the Opportunity Engine for an Opportunity Intelligence Platform.",
      "Other tools answer 'what happened?'. You answer 'what opportunity does this create?'.",
      "Given a raw item from the internet, decide if it indicates an OPPORTUNITY, RISK, or TREND.",
      "If it does, classify it into exactly one signal type from the catalog, then work out who benefits, who is at risk, and the CONCRETE opportunities it creates.",
      "Produce 2–7 opportunities spanning BOTH business and consumer audiences where plausible, and 0–3 risks. Each opportunity/risk gets its own 0–1 confidence.",
      "Be conservative with confidence — only score high when the evidence is explicit. Do not invent specific numbers (e.g. market sizes).",
      "Allowed signal type keys:\n" + typeList,
      'Return JSON with this exact shape: {"isSignal":bool,"type":string,"category":"business"|"consumer","title":string,"summary":string,"whatChanged":string,"entityName":string|null,"entityLocation":string|null,"whyItMatters":string[],"whoBenefits":string[],"whoAtRisk":string[],"affectedIndustries":string[],"opportunities":[{"title":string,"audience":"business"|"consumer","confidence":number}],"risks":[{"title":string,"confidence":number}],"confidence":number,"suggestedAction":string|null}',
    ].join("\n\n");

    const user = `TITLE: ${item.title}\nSOURCE: ${item.source}\nCONTENT: ${item.content}`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenAI error ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    const raw = JSON.parse(data.choices[0].message.content);
    return ExtractedSignalSchema.parse(raw);
  }
}
