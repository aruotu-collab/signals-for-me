import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildDigest } from "@/lib/digest";
import { sendEmail } from "@/lib/email";
import { isAuthorizedCron } from "@/lib/security/ingestAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// Scheduled daily digest send. Protected by CRON_SECRET so only Vercel Cron (or
// an authorized caller) can trigger a real email blast. Builds each user's
// personalized digest and sends it via Resend (or logs it if email isn't
// configured). Skips users with no high-confidence signals today.
async function handle(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({ select: { id: true, email: true } });

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const u of users) {
    try {
      const digest = await buildDigest(u.id);
      if (!digest || digest.count === 0) {
        skipped++;
        continue;
      }
      await sendEmail({
        to: u.email,
        subject: digest.subject,
        html: digest.html,
        text: digest.text,
      });
      sent++;
    } catch (err) {
      errors.push(`${u.email}: ${(err as Error).message}`);
    }
  }

  return NextResponse.json({ users: users.length, sent, skipped, errors });
}

// Vercel Cron issues GET requests; allow POST too for manual triggering.
export const GET = handle;
export const POST = handle;
