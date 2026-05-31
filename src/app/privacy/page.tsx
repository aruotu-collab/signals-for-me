import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Signals For Me collects, uses, and protects your data, including analytics, cookies, and email communications.",
};

const LAST_UPDATED = "31 May 2026";
const CONTACT_EMAIL = "privacy@signalsforme.com";

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">Privacy Policy</h1>
        <p className="mt-2 text-sm text-slate-400">Last updated: {LAST_UPDATED}</p>
      </header>

      <div className="space-y-8 text-sm leading-relaxed text-slate-300">
        <section>
          <p>
            Signals For Me (&quot;we&quot;, &quot;us&quot;) operates the opportunity-intelligence
            platform at signalsforme.com. This policy explains what data we collect, why, and the
            choices you have. We aim to collect as little as possible.
          </p>
        </section>

        <Section title="1. Information we collect">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="text-slate-100">Account data:</strong> your email address, which
              you provide to sign in. Sign-in is passwordless via a one-time magic link — we never
              ask for or store a password.
            </li>
            <li>
              <strong className="text-slate-100">Interests:</strong> the topics and keywords you
              select during onboarding, used to personalize your feed and digests.
            </li>
            <li>
              <strong className="text-slate-100">Usage analytics:</strong> if you accept cookies, we
              use Google Analytics to collect anonymized usage data (pages viewed, approximate
              region, device type). This is only enabled after you click &quot;Accept&quot; on our
              cookie banner.
            </li>
          </ul>
        </Section>

        <Section title="2. Cookies & analytics">
          <p>
            We do not set analytics or tracking cookies until you explicitly consent. If you decline,
            no Google Analytics script is loaded. You can change your mind at any time by clearing
            your browser&apos;s site data for signalsforme.com, which will make the consent banner
            reappear. Essential cookies required for sign-in and security may still be used.
          </p>
        </Section>

        <Section title="3. How we use your data">
          <ul className="list-disc space-y-2 pl-5">
            <li>To authenticate you and keep your session secure.</li>
            <li>To match signals to your interests and build your personalized feed.</li>
            <li>To send the email digests and product emails you sign up for.</li>
            <li>To understand aggregate usage and improve the product (only with consent).</li>
          </ul>
        </Section>

        <Section title="4. Email communications">
          <p>
            We send sign-in links and, if subscribed, opportunity digests. Every digest includes a
            one-click unsubscribe link, and we honour standard List-Unsubscribe headers. You can opt
            out of digests at any time without losing access to your account.
          </p>
        </Section>

        <Section title="5. Data sharing">
          <p>
            We do not sell your personal data. We share data only with the service providers needed
            to run the product — currently our hosting provider (Vercel), database provider, email
            provider (Resend), and analytics provider (Google Analytics) — each processing data on
            our behalf.
          </p>
        </Section>

        <Section title="6. Data retention & your rights">
          <p>
            We keep your data while your account is active. You may request access to, correction
            of, or deletion of your personal data at any time by contacting us. Depending on your
            location, you may have additional rights under the GDPR or similar laws.
          </p>
        </Section>

        <Section title="7. Contact">
          <p>
            Questions or requests about this policy or your data? Email us at{" "}
            <a className="text-signal-hiring underline" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </Section>
      </div>

      <footer className="mt-10 border-t border-white/10 pt-6">
        <Link href="/" className="btn-ghost text-sm">
          ← Back to home
        </Link>
      </footer>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold text-white">{title}</h2>
      {children}
    </section>
  );
}
