"use client";

import { useEffect } from "react";
import Link from "next/link";

// Route error boundary. Replaces Next.js's raw "Application error / Digest"
// screen with a friendly message so users never see internal error ids.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Hook a real error monitor (e.g. Sentry) here in production.
    console.error("Unhandled app error:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg py-24 text-center">
      <div className="card p-10">
        <h1 className="text-xl font-bold text-white">Something went wrong</h1>
        <p className="mt-2 text-sm text-slate-400">
          We hit an unexpected error loading this page. This is usually a temporary issue or a
          configuration problem with the server.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button onClick={reset} className="btn-primary">
            Try again
          </button>
          <Link href="/" className="btn-ghost">
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
