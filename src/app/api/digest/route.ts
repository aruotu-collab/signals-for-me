import { NextRequest, NextResponse } from "next/server";
import { buildDigest } from "@/lib/digest";
import { getDemoUser } from "@/lib/demo";

export const dynamic = "force-dynamic";

// Preview the personalized digest. `?format=html` returns the rendered email.
export async function GET(req: NextRequest) {
  const user = await getDemoUser();
  if (!user) return NextResponse.json({ error: "No demo user. Run npm run db:seed." }, { status: 404 });

  const digest = await buildDigest(user.id);
  if (!digest) return NextResponse.json({ error: "Could not build digest" }, { status: 500 });

  if (req.nextUrl.searchParams.get("format") === "html") {
    return new NextResponse(digest.html, { headers: { "Content-Type": "text/html" } });
  }
  return NextResponse.json({ subject: digest.subject, count: digest.count, text: digest.text });
}
