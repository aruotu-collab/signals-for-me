import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";

/** Server components — redirect or 404 if not admin. */
export async function requireAdminSession(callbackPath = "/admin"): Promise<string> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) redirect(`/login?callbackUrl=${encodeURIComponent(callbackPath)}`);
  if (!isAdminEmail(email)) notFound();
  return email;
}

/** Server actions — returns error object instead of redirecting. */
export async function requireAdminAction(): Promise<{ email: string } | { error: string }> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email || !isAdminEmail(email)) return { error: "Unauthorized." };
  return { email };
}
