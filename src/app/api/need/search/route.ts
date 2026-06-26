import { NextResponse } from "next/server";
import { searchPublishedCampaigns } from "@/lib/intent/queries";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const results = await searchPublishedCampaigns(q, 8);
  return NextResponse.json({
    results: results.map((r) => ({
      id: r.id,
      slug: r.slug,
      h1: r.h1,
      serviceName: r.serviceName,
    })),
  });
}
