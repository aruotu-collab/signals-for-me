// Single email sender used by both auth magic-links and the digest pipeline.
// Uses Resend (https://resend.com) when RESEND_API_KEY is set; otherwise it logs
// the message to the server console so the whole flow still works in local dev
// without any email credentials.

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
  /** Reply-To address. Defaults to REPLY_TO env, then the From address. */
  replyTo?: string;
  /** Extra SMTP headers (e.g. List-Unsubscribe). */
  headers?: Record<string, string>;
}

export interface EmailResult {
  sent: boolean;
  via: "resend" | "console";
}

const DEFAULT_FROM = "Signals For Me <onboarding@resend.dev>";

export async function sendEmail(msg: EmailMessage): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.DIGEST_FROM || DEFAULT_FROM;
  const replyTo = msg.replyTo || process.env.REPLY_TO || extractAddress(from);

  // Always include a plain-text part — multipart emails score far better with
  // spam filters than HTML-only — and a unique reference id so mailbox providers
  // (notably Gmail) don't collapse or trim separate messages into one thread.
  const text = msg.text ?? stripHtml(msg.html);
  const headers: Record<string, string> = {
    "X-Entity-Ref-ID": uniqueId(),
    ...msg.headers,
  };

  if (!apiKey) {
    const isProd = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
    if (isProd) {
      throw new Error(
        "Email is not configured (RESEND_API_KEY missing). Add it in Vercel environment variables.",
      );
    }
    // Dev fallback: surface the email in the logs.
    console.log(
      [
        "",
        "──────── EMAIL (dev: RESEND_API_KEY not set) ────────",
        `To:      ${msg.to}`,
        `Subject: ${msg.subject}`,
        "",
        text,
        "─────────────────────────────────────────────────────",
        "",
      ].join("\n"),
    );
    return { sent: false, via: "console" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: msg.to,
      reply_to: replyTo,
      subject: msg.subject,
      html: msg.html,
      text,
      headers,
    }),
  });

  if (!res.ok) {
    throw new Error(`Resend error ${res.status}: ${await res.text()}`);
  }
  return { sent: true, via: "resend" };
}

// Pull the bare email out of a "Name <email>" From string.
function extractAddress(from: string): string {
  const m = from.match(/<([^>]+)>/);
  return m ? m[1] : from;
}

function uniqueId(): string {
  try {
    return globalThis.crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
