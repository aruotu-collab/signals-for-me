import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";

/** URL-safe slug for a pickup hub, e.g. "London" → "london". */
export function hubToSlug(hub: string): string {
  return hub
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** URL-safe slug for a service category. */
export function serviceToSlug(service: string): string {
  return hubToSlug(service);
}

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function buildPageMetadata(opts: {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
}): Metadata {
  const url = absoluteUrl(opts.path);
  return {
    title: opts.title,
    description: opts.description,
    keywords: opts.keywords,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title: opts.title,
      description: opts.description,
      siteName: "SignalsForMe",
    },
    twitter: {
      card: "summary_large_image",
      title: opts.title,
      description: opts.description,
    },
    robots: { index: true, follow: true },
  };
}

export const SITE_KEYWORDS = [
  "eBay auction profit",
  "flip watches UK",
  "undervalued eBay auctions",
  "auction intelligence",
  "eBay resale calculator",
  "Flip Radar",
  "watch flipping UK",
  "phone auction flips",
  "MacBook auction profit",
];

export const HOME_FAQ = [
  {
    question: "What is SignalsForMe?",
    answer:
      "SignalsForMe is Flip Radar — auction intelligence for UK eBay. It finds ending-soon auctions in watches, phones and laptops and estimates net profit after fees so you can bid with a clear max.",
  },
  {
    question: "How does Flip Radar work?",
    answer:
      "Set how much profit you want. We scan UK eBay auctions ending soon, estimate market value from brand heuristics and live Buy-it-now comps, then subtract typical selling fees and postage to show net profit, ROI and confidence.",
  },
  {
    question: "Is SignalsForMe free to use?",
    answer: "Yes. Flip Radar is free to browse. Always verify sold comps and condition on eBay before you bid.",
  },
  {
    question: "Why start with watches?",
    answer:
      "Watches are a strong flip niche when you know brands and models. Phones and laptops are included for extra volume. Set a profit target and scan across categories when you want more leads.",
  },
  {
    question: "Are the profit numbers guaranteed?",
    answer:
      "No. Estimates can be wrong — especially on rare models, parts listings, or thin comps. Treat every row as a lead, open the listing, and confirm recent sold prices yourself.",
  },
] as const;

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "SignalsForMe",
    url: SITE_URL,
    description:
      "Flip Radar — UK eBay auction intelligence. Find undervalued watches, phones and laptops with estimated net profit after fees.",
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "SignalsForMe",
    url: SITE_URL,
    description: "Auction profit intelligence for UK eBay flippers.",
  };
}

export function faqJsonLd(items: readonly { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function jobListingJsonLd(opts: {
  hub: string;
  jobCount: number;
  sampleTitles: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Delivery jobs in ${opts.hub}`,
    description: `${opts.jobCount.toLocaleString("en-GB")} open UK delivery jobs picking up in ${opts.hub}.`,
    url: absoluteUrl(`/jobs/${hubToSlug(opts.hub)}`),
    about: opts.sampleTitles.slice(0, 5).map((title) => ({
      "@type": "Thing",
      name: title,
    })),
  };
}
