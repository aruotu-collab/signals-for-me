// Admin access control. Admins are identified by email via the ADMIN_EMAILS
// env var (comma-separated, case-insensitive). Reuses the existing magic-link
// auth — no separate password system.
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return adminEmails().includes(email.toLowerCase());
}
