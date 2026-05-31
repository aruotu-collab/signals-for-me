import { sendEmail } from "@/lib/email";

// Custom magic-link delivery for the Auth.js email provider. Sends a branded
// sign-in email via Resend (or logs the link in dev). The link itself is built
// and validated by Auth.js against the VerificationToken table.
export async function sendVerificationRequest(params: {
  identifier: string;
  url: string;
}): Promise<void> {
  const { identifier: to, url } = params;
  const parsed = new URL(url);
  const host = parsed.host;

  // Point the email at our /verify interstitial instead of the raw Auth.js
  // callback. Email security scanners (Gmail/Safe Browsing/antivirus) GET links
  // to inspect them, which would otherwise consume the single-use token before
  // the user clicks. The interstitial requires a human button press to proceed,
  // so a scanner's GET can't burn the token. Built on the same origin as the
  // callback to avoid any apex<->www redirect mid-flow.
  const verifyUrl = `${parsed.origin}/verify?url=${encodeURIComponent(url)}`;

  await sendEmail({
    to,
    subject: `Sign in to Signals For Me`,
    html: magicLinkHtml(verifyUrl, host),
    text: `Sign in to Signals For Me\n\nClick the link below to sign in:\n${verifyUrl}\n\nIf you didn't request this, you can safely ignore this email.`,
  });
}

function magicLinkHtml(url: string, host: string): string {
  const escapedUrl = url.replace(/&/g, "&amp;");
  return `<!doctype html><html><body style="margin:0;background:#f3f4f6;font-family:system-ui,Segoe UI,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px;">
    <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:14px;padding:32px;">
      <tr><td>
        <div style="font-size:13px;color:#6b7280;letter-spacing:.04em;">SIGNALS FOR ME</div>
        <h1 style="font-size:22px;color:#0e111b;margin:8px 0 4px;">Sign in</h1>
        <p style="font-size:14px;color:#374151;margin:0 0 24px;">Click the button below, then confirm on the next screen to sign in. This link expires in 24 hours.</p>
        <a href="${escapedUrl}" style="display:inline-block;background:#2f6bff;color:#fff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:10px;font-size:15px;">Sign in to Signals For Me</a>
        <p style="font-size:12px;color:#9ca3af;margin:24px 0 0;">Or paste this URL into your browser:<br>${escapedUrl}</p>
        <p style="font-size:12px;color:#9ca3af;margin:16px 0 0;">If you didn't request this email from ${host}, you can safely ignore it.</p>
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}
