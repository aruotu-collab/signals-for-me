import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyUnsubscribe } from "@/lib/unsubscribe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Email digest unsubscribe.
//  - POST: RFC 8058 one-click unsubscribe (Gmail/Apple send this automatically
//    from the List-Unsubscribe header). Also handles the confirm form below.
//  - GET:  human-facing link from the email footer. Shows a confirmation page
//    with a POST button — we deliberately DON'T opt out on GET so link-scanners
//    and mail prefetchers can't unsubscribe people by accident.
export async function POST(req: NextRequest) {
  const u = req.nextUrl.searchParams.get("u") ?? "";
  const t = req.nextUrl.searchParams.get("t") ?? "";

  if (!verifyUnsubscribe(u, t)) {
    return new NextResponse(null, { status: 400 });
  }
  try {
    await prisma.user.update({ where: { id: u }, data: { digestOptOut: true } });
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  // RFC 8058 one-click clients expect an empty 200; form submitters get a page.
  const body = await req.text().catch(() => "");
  if (body.includes("One-Click")) {
    return new NextResponse(null, { status: 200 });
  }
  return htmlResponse(donePage(), 200);
}

export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams.get("u") ?? "";
  const t = req.nextUrl.searchParams.get("t") ?? "";
  if (!verifyUnsubscribe(u, t)) {
    return htmlResponse(invalidPage(), 400);
  }
  return htmlResponse(confirmPage(u, t), 200);
}

function htmlResponse(html: string, status: number): NextResponse {
  return new NextResponse(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function shell(inner: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Unsubscribe · Signals For Me</title></head>
  <body style="margin:0;background:#0b0e16;color:#e2e8f0;font-family:system-ui,Segoe UI,Arial,sans-serif;">
    <div style="max-width:480px;margin:64px auto;padding:32px;background:#121726;border:1px solid rgba(255,255,255,.08);border-radius:16px;">
      <div style="font-size:12px;letter-spacing:.06em;color:#94a3b8;">SIGNALS FOR ME</div>
      ${inner}
      <p style="margin-top:24px;"><a href="/" style="color:#6ea0ff;">Back to Signals For Me</a></p>
    </div>
  </body></html>`;
}

function confirmPage(u: string, t: string): string {
  return shell(
    `<h1 style="font-size:22px;">Unsubscribe from the digest?</h1>
     <p style="color:#94a3b8;">You'll stop receiving the Signals For Me email digest. You can re-enable it anytime in the app.</p>
     <form method="post" action="/api/unsubscribe?u=${encodeURIComponent(u)}&t=${encodeURIComponent(t)}">
       <button type="submit" style="margin-top:12px;background:#2f6bff;color:#fff;border:0;font-weight:600;padding:12px 20px;border-radius:10px;font-size:15px;cursor:pointer;">Yes, unsubscribe</button>
     </form>`,
  );
}

function donePage(): string {
  return shell(
    `<h1 style="font-size:22px;">You're unsubscribed</h1>
     <p style="color:#94a3b8;">You won't receive the Signals For Me email digest anymore.</p>`,
  );
}

function invalidPage(): string {
  return shell(
    `<h1 style="font-size:22px;">Link expired or invalid</h1>
     <p style="color:#94a3b8;">We couldn't process this unsubscribe link. Please use the link from your most recent email, or manage preferences in the app.</p>`,
  );
}
