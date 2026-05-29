import { NextRequest, NextResponse } from "next/server";
import { runPipeline } from "@/lib/pipeline";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Trigger one ingestion cycle. In production this is called by a scheduler
// (cron / queue worker), not the browser. Optional body: { feedUrls: string[] }.
export async function POST(req: NextRequest) {
  let feedUrls: string[] = [];
  try {
    const body = await req.json();
    if (Array.isArray(body?.feedUrls)) feedUrls = body.feedUrls;
  } catch {
    // no body — fine
  }
  const result = await runPipeline(feedUrls);
  return NextResponse.json(result);
}
