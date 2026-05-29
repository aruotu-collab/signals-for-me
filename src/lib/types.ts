import { z } from "zod";

// A raw item pulled from a source before any AI processing.
export interface RawItem {
  title: string;
  content: string;
  url?: string;
  source: "news" | "job_board" | "gov" | "social" | "mock";
  publishedAt?: string;
}

// The structured result the AI provider returns for a raw item.
export const ExtractedSignalSchema = z.object({
  isSignal: z.boolean(),
  type: z.string(),
  category: z.enum(["business", "consumer"]),
  title: z.string(),
  summary: z.string(),
  entityName: z.string().nullable().optional(),
  entityLocation: z.string().nullable().optional(),
  whyItMatters: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1),
  suggestedAction: z.string().nullable().optional(),
});

export type ExtractedSignal = z.infer<typeof ExtractedSignalSchema>;

// The shape served to the frontend (parsed/normalized).
export interface SignalDTO {
  id: string;
  type: string;
  typeLabel: string;
  category: "business" | "consumer";
  groupName: string;
  title: string;
  summary: string;
  entityName: string | null;
  entityDomain: string | null;
  entityLocation: string | null;
  whyItMatters: string[];
  confidence: number;
  suggestedAction: string | null;
  sourceUrl: string | null;
  rawSource: string;
  detectedAt: string;
}
