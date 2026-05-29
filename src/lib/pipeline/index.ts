import { prisma } from "@/lib/db";
import { getAIProvider } from "./ai/provider";
import { fetchMockItems } from "./sources/mockSource";
import { fetchRssItems } from "./sources/rssSource";
import { embed } from "./embedding";
import { getSignalType } from "@/lib/taxonomy";
import type { RawItem, ExtractedSignal } from "@/lib/types";

export interface PipelineResult {
  itemsFetched: number;
  signalsKept: number;
  duplicates: number;
  rejected: number;
  provider: string;
}

// Cheap pre-filter: discard obvious noise before paying for the AI step.
// In production this saves the bulk of LLM cost.
function looksInteresting(item: RawItem): boolean {
  const text = `${item.title} ${item.content}`;
  return text.trim().length > 20;
}

function normalizeKey(s: ExtractedSignal): string {
  const entity = (s.entityName ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${s.type}:${entity || hashTitle(s.title)}`;
}

function hashTitle(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 40);
}

/**
 * Run one ingestion cycle: fetch -> pre-filter -> AI extract -> dedup -> store.
 * `feedUrls` optionally adds live RSS sources alongside the mock source.
 */
export async function runPipeline(feedUrls: string[] = []): Promise<PipelineResult> {
  const ai = getAIProvider();
  const run = await prisma.pipelineRun.create({ data: { provider: ai.name } });

  // 1. Ingest from all configured sources.
  const items: RawItem[] = [...(await fetchMockItems())];
  for (const url of feedUrls) {
    items.push(...(await fetchRssItems(url)));
  }

  let kept = 0;
  let duplicates = 0;
  let rejected = 0;

  for (const item of items) {
    // 2. Cheap pre-filter.
    if (!looksInteresting(item)) {
      rejected++;
      continue;
    }

    // 3. AI extraction (mock or real).
    let extracted: ExtractedSignal;
    try {
      extracted = await ai.extract(item);
    } catch (err) {
      console.error("AI extract failed:", err);
      rejected++;
      continue;
    }

    if (!extracted.isSignal || extracted.confidence < 0.5) {
      rejected++;
      continue;
    }

    // 4. Dedup by normalized fingerprint.
    const dedupKey = normalizeKey(extracted);
    const exists = await prisma.signal.findUnique({ where: { dedupKey } });
    if (exists) {
      duplicates++;
      continue;
    }

    const def = getSignalType(extracted.type);
    const embedding = embed(`${extracted.title} ${extracted.summary}`);

    // 5. Store.
    await prisma.signal.create({
      data: {
        type: extracted.type,
        category: extracted.category,
        groupName: def?.group ?? "Other",
        title: extracted.title,
        summary: extracted.summary,
        entityName: extracted.entityName ?? null,
        entityLocation: extracted.entityLocation ?? null,
        whyItMatters: JSON.stringify(extracted.whyItMatters ?? []),
        confidence: extracted.confidence,
        suggestedAction: extracted.suggestedAction ?? null,
        sourceUrl: item.url ?? null,
        rawSource: item.source,
        embedding: JSON.stringify(embedding),
        dedupKey,
      },
    });
    kept++;
  }

  await prisma.pipelineRun.update({
    where: { id: run.id },
    data: {
      finishedAt: new Date(),
      itemsFetched: items.length,
      signalsKept: kept,
      duplicates,
      rejected,
    },
  });

  return {
    itemsFetched: items.length,
    signalsKept: kept,
    duplicates,
    rejected,
    provider: ai.name,
  };
}
