import { NextResponse } from "next/server";
import { findSourceOpportunities } from "@/lib/source/find";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function positiveNumber(raw: string | null): number | undefined {
  if (raw == null || raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const minProfit = positiveNumber(url.searchParams.get("minProfit")) ?? 7;
  const maxDaysToSell = positiveNumber(url.searchParams.get("maxDaysToSell"));
  const limit = positiveNumber(url.searchParams.get("limit")) ?? 24;

  try {
    const result = await findSourceOpportunities({ minProfit, maxDaysToSell, limit });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      {
        opportunities: [],
        scanned: 0,
        source: "error",
        supplier: "cj",
        error: e instanceof Error ? e.message : "Source scan failed",
      },
      { status: 500 },
    );
  }
}
