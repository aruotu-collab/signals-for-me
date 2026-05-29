import type { RawItem, ExtractedSignal } from "@/lib/types";

// Contract every AI provider implements. The pipeline only depends on this,
// so swapping mock -> OpenAI -> Anthropic is a one-line config change.
export interface AIProvider {
  name: string;
  /**
   * Decide whether a raw item is an opportunity/risk/trend and, if so, return a
   * structured signal. Return `isSignal: false` to discard.
   */
  extract(item: RawItem): Promise<ExtractedSignal>;
}

import { MockProvider } from "./mockProvider";
import { OpenAIProvider } from "./openaiProvider";

export function getAIProvider(): AIProvider {
  const provider = (process.env.AI_PROVIDER ?? "mock").toLowerCase();
  if (provider === "openai" && process.env.OPENAI_API_KEY) {
    return new OpenAIProvider();
  }
  return new MockProvider();
}
