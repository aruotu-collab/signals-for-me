import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata = { title: "Confirm sign in" };

// Human-confirmation step for magic links. The email points here instead of the
// raw Auth.js callback so that link scanners (which only GET) can't consume the
// one-time token — only a real click on the button below completes sign-in.
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const { url } = await searchParams;
  const target = safeCallbackUrl(url);

  return (
    <div className="mx-auto max-w-md">
      <div className="card mt-10 p-7 text-center">
        <div className="text-xs uppercase tracking-wide text-slate-500">Signals For Me</div>
        <h1 className="mt-1 text-2xl font-bold text-white">Confirm sign in</h1>
        {target ? (
          <>
            <p className="mt-2 text-sm text-slate-400">
              Click below to finish signing in to your account.
            </p>
            <a href={target} className="btn-primary mt-6 inline-flex justify-center px-6 py-2.5">
              Confirm sign in
            </a>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-slate-400">
              This link is invalid or has expired. Request a fresh sign-in link to continue.
            </p>
            <a href="/login" className="btn-primary mt-6 inline-flex justify-center px-6 py-2.5">
              Back to sign in
            </a>
          </>
        )}
      </div>
    </div>
  );
}

// Only allow Auth.js callback URLs on our own domain — prevents the page from
// being abused as an open redirect.
function safeCallbackUrl(raw?: string): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    const site = new URL(SITE_URL);
    const norm = (h: string) => h.replace(/^www\./, "");
    const sameSite = norm(u.hostname) === norm(site.hostname);
    const okProtocol = u.protocol === "https:" || u.hostname === "localhost";
    if (sameSite && okProtocol && u.pathname.startsWith("/api/auth/callback/")) {
      return u.toString();
    }
    return null;
  } catch {
    return null;
  }
}
