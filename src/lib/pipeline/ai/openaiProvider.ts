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
      "You are the signal-extraction engine for an Opportunity Intelligence Platform.",
      "Given a raw item from the internet, decide if it indicates an OPPORTUNITY, RISK, or TREND.",
      "If it does, classify it into exactly one signal type from the catalog and return structured JSON.",
      "Be conservative with confidence — only score high when the evidence is explicit.",
      "Allowed signal type keys:\n" + typeList,
      'Return JSON: {"isSignal":bool,"type":string,"category":"business"|"consumer","title":string,"summary":string,"entityName":string|null,"entityLocation":string|null,"whyItMatters":string[],"confidence":number(0-1),"suggestedAction":string|null}',
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
