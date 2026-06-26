import { prisma } from "@/lib/db";
import { unsubscribeUrl } from "@/lib/unsubscribe";
import { SITE_URL } from "@/lib/site";
import { getDemandIdeas } from "@/lib/demand";

// Builds the "Signals For <Name>" email digest. Returns subject + HTML so it can
// be sent via any provider. In production, call Resend/Postmark with this HTML
// on a daily schedule (see scripts/run-digest.ts and TECHNICAL_SPEC.md).
export async function buildDigest(userId: string): Promise<{
  subject: string;
  html: string;
  text: string;
  count: number;
} | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const name = user.name ?? user.email.split("@")[0];
  const audience = user.audience ?? "consumer";

  // For now, keep the digest global (top/trending). We can later personalize
  // it by category once users choose interests.
  const ideas = await getDemandIdeas({ sort: "trending", limit: 8 }).catch(() => []);
  const subject =
    audience === "business"
      ? `Demand Intelligence — ${ideas.length} emerging demands`
      : `Demand Digest for ${name} — ${ideas.length} ideas to vote on`;

  const unsubUrl = unsubscribeUrl(userId);
  const html = renderHtml({ name, audience, ideas, unsubUrl });
  const text = renderText({ name, audience, ideas, unsubUrl });
  return { subject, html, text, count: ideas.length };
}

type DigestIdea = Awaited<ReturnType<typeof getDemandIdeas>>[number];

function renderHtml({
  name,
  audience,
  ideas,
  unsubUrl,
}: {
  name: string;
  audience: string;
  ideas: DigestIdea[];
  unsubUrl: string;
}): string {
  const cards = ideas
    .map((i) => {
      const totalVotes = Object.values(i.stats.voteCounts).reduce((a, b) => a + b, 0);
      const url = `${SITE_URL}/ideas/${i.id}`;
      const growth =
        i.stats.growth7d !== 0
          ? `<span style="margin-left:8px;color:${i.stats.growth7d > 0 ? "#16a34a" : "#ef4444"};font-weight:700;">${
              i.stats.growth7d > 0 ? "+" : ""
            }${i.stats.growth7d}%</span>`
          : "";
      return `
    <tr><td style="padding:16px 0;border-bottom:1px solid #e5e7eb;">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#2f6bff;font-weight:700;">
        Demand Score: ${escape(String(i.stats.demandScore))} · ${escape(i.stats.strength)}${growth}
      </div>
      <div style="font-size:16px;font-weight:700;color:#0e111b;margin:4px 0;">${escape(i.title)}</div>
      <div style="font-size:14px;color:#374151;">${escape(i.description)}</div>
      <div style="margin-top:8px;font-size:12px;color:#6b7280;">
        ${escape(String(totalVotes))} votes · ${escape(String(i.stats.commentCount))} comments${
          i.location ? ` · ${escape(i.location)}` : ""
        }
      </div>
      <div style="margin-top:12px;">
        <a href="${escape(url)}" style="display:inline-block;background:#2f6bff;color:#fff;text-decoration:none;padding:10px 14px;border-radius:10px;font-weight:700;font-size:13px;">
          ${audience === "business" ? "View demand details" : "Vote on this"}
        </a>
      </div>
    </td></tr>`;
    })
    .join("");

  return `<!doctype html><html><body style="margin:0;background:#f3f4f6;font-family:system-ui,Segoe UI,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px;">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:14px;padding:28px;">
      <tr><td>
        <div style="font-size:13px;color:#6b7280;">SIGNALS FOR ME</div>
        <h1 style="font-size:22px;color:#0e111b;margin:6px 0 2px;">${
          audience === "business" ? "Demand Intelligence" : `Demand Digest for ${escape(name)}`
        }</h1>
        <div style="font-size:14px;color:#6b7280;">${
          audience === "business"
            ? `${ideas.length} emerging demands your customers want.`
            : `${ideas.length} ideas to vote on — help businesses build the right thing.`
        }</div>
      </td></tr>
      <tr><td><table width="100%">${cards || emptyRow()}</table></td></tr>
      <tr><td style="padding-top:18px;font-size:12px;color:#9ca3af;">
        You're receiving this because you subscribed to signals.
        <a href="${escape(unsubUrl)}" style="color:#9ca3af;text-decoration:underline;">Unsubscribe</a>.
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

function emptyRow(): string {
  return `<tr><td style="padding:16px 0;color:#6b7280;">No demand ideas yet. We'll keep collecting votes.</td></tr>`;
}

function renderText({
  name,
  audience,
  ideas,
  unsubUrl,
}: {
  name: string;
  audience: string;
  ideas: DigestIdea[];
  unsubUrl: string;
}): string {
  const lines = ideas.map((i) => {
    const totalVotes = Object.values(i.stats.voteCounts).reduce((a, b) => a + b, 0);
    const url = `${SITE_URL}/ideas/${i.id}`;
    return `• [Demand ${i.stats.demandScore} · ${i.stats.strength}] ${i.title}\n  ${i.description}\n  ${totalVotes} votes · ${i.stats.commentCount} comments${i.location ? ` · ${i.location}` : ""}\n  → ${url}`;
  });
  const heading =
    audience === "business" ? "Demand Intelligence" : `Demand Digest for ${name}`;
  return `${heading}\n\n${lines.join("\n\n") || "No demand ideas yet."}\n\n—\nUnsubscribe: ${unsubUrl}`;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
