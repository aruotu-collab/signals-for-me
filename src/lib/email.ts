// Single email sender used by both auth magic-links and the digest pipeline.
// Uses Resend (https://resend.com) when RESEND_API_KEY is set; otherwise it logs
// the message to the server console so the whole flow still works in local dev
// without any email credentials.

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailResult {
  sent: boolean;
  via: "resend" | "console";
}

const DEFAULT_FROM = "Signals For Me <onboarding@resend.dev>";

export async function sendEmail(msg: EmailMessage): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.DIGEST_FROM || DEFAULT_FROM;

  if (!apiKey) {
    // Dev / unconfigured fallback: surface the email in the logs.
    console.log(
      [
        "",
        "──────── EMAIL (dev: RESEND_API_KEY not set) ────────",
        `To:      ${msg.to}`,
        `Subject: ${msg.subject}`,
        "",
        msg.text ?? stripHtml(msg.html),
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
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
    }),
  });

  if (!res.ok) {
    throw new Error(`Resend error ${res.status}: ${await res.text()}`);
  }
  return { sent: true, via: "resend" };
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
