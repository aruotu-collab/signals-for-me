import { NextResponse } from "next/server";
import { findFlipOpportunities } from "@/lib/flip/score";
import { FLIP_CATEGORIES, type FlipCategory } from "@/lib/flip/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function parseCategory(raw: string | null): FlipCategory {
  if (!raw || raw === "all") return "all";
  if ((FLIP_CATEGORIES as readonly string[]).includes(raw)) {
    return raw as Exclude<FlipCategory, "all">;
  }
  return "all";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const minProfit = Number(url.searchParams.get("minProfit") ?? "100");
  const maxEndsInHours = Number(url.searchParams.get("maxEndsInHours") ?? "24");
  const category = parseCategory(url.searchParams.get("category"));
  const includeRisky = url.searchParams.get("includeRisky") === "1";

  try {
    const result = await findFlipOpportunities({
      minProfit: Number.isFinite(minProfit) ? minProfit : 100,
      maxEndsInHours: Number.isFinite(maxEndsInHours) ? maxEndsInHours : 24,
      category,
      includeRisky,
      enrichComps: true,
    });

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      {
        opportunities: [],
        scanned: 0,
        source: "error",
        categories: [],
        error: e instanceof Error ? e.message : "Flip scan failed",
      },
      { status: 500 },
    );
  }
}
