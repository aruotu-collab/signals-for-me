import { NextResponse } from "next/server";
import { getJobsByKeys } from "@/lib/shiply";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { keys?: unknown } | null;
  const keys = Array.isArray(body?.keys) ? (body!.keys as unknown[]).map(String).slice(0, 500) : [];
  if (keys.length === 0) return NextResponse.json({ jobs: [] });

  const jobs = await getJobsByKeys(keys);
  // Preserve incoming (already-sorted) key order.
  const order = new Map(keys.map((k, i) => [k, i]));
  jobs.sort((a, b) => (order.get(a.shiplyKey) ?? 0) - (order.get(b.shiplyKey) ?? 0));

  return NextResponse.json({ jobs });
}
