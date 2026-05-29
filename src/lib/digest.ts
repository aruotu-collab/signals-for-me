import { prisma } from "@/lib/db";
import { personalizedFeed } from "@/lib/signals";
import type { SignalDTO } from "@/lib/types";

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

  const signals = (await personalizedFeed(userId, 8)).filter((s) => s.confidence >= 0.6);
  const name = user.name ?? user.email.split("@")[0];
  const subject = `Signals For ${name} — ${signals.length} new opportunities`;

  const html = renderHtml(name, signals);
  const text = renderText(name, signals);
  return { subject, html, text, count: signals.length };
}

function renderHtml(name: string, signals: SignalDTO[]): string {
  const cards = signals
    .map(
      (s) => `
    <tr><td style="padding:16px 0;border-bottom:1px solid #e5e7eb;">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#2f6bff;font-weight:700;">
        ${escape(s.typeLabel)} · ${(s.confidence * 100).toFixed(0)}% confidence
      </div>
      <div style="font-size:16px;font-weight:700;color:#0e111b;margin:4px 0;">${escape(s.title)}</div>
      <div style="font-size:14px;color:#374151;">${escape(s.summary)}</div>
      ${
        s.suggestedAction
          ? `<div style="margin-top:8px;font-size:13px;color:#1f54e6;"><b>Suggested action:</b> ${escape(s.suggestedAction)}</div>`
          : ""
      }
    </td></tr>`,
    )
    .join("");

  return `<!doctype html><html><body style="margin:0;background:#f3f4f6;font-family:system-ui,Segoe UI,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px;">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:14px;padding:28px;">
      <tr><td>
        <div style="font-size:13px;color:#6b7280;">SIGNALS FOR ME</div>
        <h1 style="font-size:22px;color:#0e111b;margin:6px 0 2px;">Signals For ${escape(name)}</h1>
        <div style="font-size:14px;color:#6b7280;">${signals.length} opportunities worth your attention today.</div>
      </td></tr>
      <tr><td><table width="100%">${cards || emptyRow()}</table></td></tr>
      <tr><td style="padding-top:18px;font-size:12px;color:#9ca3af;">
        You're receiving this because you subscribed to signals. Manage preferences in the app.
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

function emptyRow(): string {
  return `<tr><td style="padding:16px 0;color:#6b7280;">No high-confidence signals today. We'll keep scanning.</td></tr>`;
}

function renderText(name: string, signals: SignalDTO[]): string {
  const lines = signals.map(
    (s) =>
      `• [${s.typeLabel} ${(s.confidence * 100).toFixed(0)}%] ${s.title}\n  ${s.summary}${
        s.suggestedAction ? `\n  → ${s.suggestedAction}` : ""
      }`,
  );
  return `Signals For ${name}\n\n${lines.join("\n\n") || "No high-confidence signals today."}`;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
