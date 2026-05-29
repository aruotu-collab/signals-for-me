import { z } from "zod";

// A raw item pulled from a source before any AI processing.
export interface RawItem {
  title: string;
  content: string;
  url?: string;
  source: "news" | "job_board" | "gov" | "social" | "mock";
  publishedAt?: string;
}

// A single opportunity created by a signal.
export const OpportunitySchema = z.object({
  title: z.string(),
  audience: z.enum(["business", "consumer"]),
  confidence: z.number().min(0).max(1),
});
export type ExtractedOpportunity = z.infer<typeof OpportunitySchema>;

// A single risk exposed by a signal.
export const RiskSchema = z.object({
  title: z.string(),
  confidence: z.number().min(0).max(1),
});
export type ExtractedRisk = z.infer<typeof RiskSchema>;

// The structured result the AI provider returns for a raw item — the
// "Opportunity Engine" output.
export const ExtractedSignalSchema = z.object({
  isSignal: z.boolean(),
  type: z.string(),
  category: z.enum(["business", "consumer"]),
  title: z.string(),
  summary: z.string(),
  whatChanged: z.string().nullable().optional(),
  entityName: z.string().nullable().optional(),
  entityLocation: z.string().nullable().optional(),
  whyItMatters: z.array(z.string()).default([]),
  whoBenefits: z.array(z.string()).default([]),
  whoAtRisk: z.array(z.string()).default([]),
  affectedIndustries: z.array(z.string()).default([]),
  opportunities: z.array(OpportunitySchema).default([]),
  risks: z.array(RiskSchema).default([]),
  confidence: z.number().min(0).max(1),
  suggestedAction: z.string().nullable().optional(),
});

export type ExtractedSignal = z.infer<typeof ExtractedSignalSchema>;

export interface OpportunityDTO {
  title: string;
  audience: "business" | "consumer";
  confidence: number;
}

export interface RiskDTO {
  title: string;
  confidence: number;
}

// The shape served to the frontend (parsed/normalized).
export interface SignalDTO {
  id: string;
  type: string;
  typeLabel: string;
  category: "business" | "consumer";
  groupName: string;
  title: string;
  summary: string;
  whatChanged: string | null;
  entityName: string | null;
  entityDomain: string | null;
  entityLocation: string | null;
  whyItMatters: string[];
  whoBenefits: string[];
  whoAtRisk: string[];
  affectedIndustries: string[];
  opportunities: OpportunityDTO[];
  risks: RiskDTO[];
  confidence: number;
  suggestedAction: string | null;
  sourceUrl: string | null;
  rawSource: string;
  detectedAt: string;
}
