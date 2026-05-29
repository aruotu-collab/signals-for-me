import { NextRequest, NextResponse } from "next/server";
import { runPipeline } from "@/lib/pipeline";
import { isAuthorizedIngest } from "@/lib/security/ingestAuth";
import { assertSafeFeedUrl, UnsafeUrlError } from "@/lib/security/urlGuard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// Trigger one ingestion cycle.
//
// Authorization model:
//  - Privileged runs (custom `feedUrls`) require `Authorization: Bearer
//    <CRON_SECRET>` — used by Vercel Cron / server schedulers.
//  - Unauthenticated callers (the public "Scan for signals" button) get a safe,
//    bounded run of the built-in mock source only. They cannot supply URLs, so
//    there is no SSRF surface.
//
// NOTE: rate limiting is a separate follow-up (P0 #4) before public beta.
export async function POST(req: NextRequest) {
  const authorized = isAuthorizedIngest(req);

  let feedUrls: string[] = [];
  try {
    const body = await req.json();
    if (Array.isArray(body?.feedUrls)) {
      feedUrls = body.feedUrls.filter((u: unknown): u is string => typeof u === "string");
    }
  } catch {
    // no body — fine
  }

  if (feedUrls.length > 0 && !authorized) {
    return NextResponse.json(
      { error: "Custom feed URLs require authorization." },
      { status: 401 },
    );
  }

  // Validate any supplied URLs against the SSRF guard before fetching.
  const safeFeeds: string[] = [];
  for (const url of feedUrls) {
    try {
      safeFeeds.push(await assertSafeFeedUrl(url));
    } catch (err) {
      if (err instanceof UnsafeUrlError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      throw err;
    }
  }

  const result = await runPipeline(safeFeeds);
  return NextResponse.json(result);
}
