import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { exportCatalogJson } from "@/app/admin/catalog/actions";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const json = await exportCatalogJson();
  return new NextResponse(json, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="demand-catalog.json"',
    },
  });
}
