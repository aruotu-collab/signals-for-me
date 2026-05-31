"use client";

import { useEffect, useState } from "react";
import { GoogleAnalytics } from "@next/third-parties/google";

const STORAGE_KEY = "sfm-cookie-consent";
type Choice = "accepted" | "declined";

// Lightweight, consent-gated analytics. The GA script is only loaded after the
// visitor explicitly accepts, and the choice is remembered in localStorage so
// the banner doesn't reappear. No cookies/trackers run before consent.
export function CookieConsent({ gaId }: { gaId: string }) {
  const [choice, setChoice] = useState<Choice | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "accepted" || stored === "declined") {
        setChoice(stored);
      }
    } catch {
      // localStorage unavailable (private mode / blocked) — show banner.
    }
    setReady(true);
  }, []);

  function decide(value: Choice) {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // ignore persistence failures
    }
    setChoice(value);
  }

  return (
    <>
      {choice === "accepted" && <GoogleAnalytics gaId={gaId} />}
      {ready && choice === null && (
        <div
          role="dialog"
          aria-label="Cookie consent"
          className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#0e111b]/95 backdrop-blur"
        >
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-300">
              We use cookies for anonymous analytics to understand how the site is used.
              No tracking runs until you accept.
            </p>
            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => decide("declined")}
                className="btn-ghost px-4 py-2 text-sm"
              >
                Decline
              </button>
              <button
                onClick={() => decide("accepted")}
                className="btn-primary px-4 py-2 text-sm"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
