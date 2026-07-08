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
  "UK delivery jobs",
  "courier jobs UK",
  "Shiply jobs",
  "delivery driver jobs",
  "van driver jobs",
  "pickup and delivery jobs",
  "eBay collection delivery",
  "eBay delivery quote",
  "route planner courier",
  "delivery jobs by location",
];

export const HOME_FAQ = [
  {
    question: "What is SignalsForMe?",
    answer:
      "SignalsForMe is a Route Radar for UK delivery drivers and buyers. Drivers use Pickup Radar to find Shiply jobs by pickup location, plan routes, and estimate profit. Buyers can get eBay collection-only delivery quotes before they bid.",
  },
  {
    question: "How does Pickup Radar work?",
    answer:
      "Pickup Radar shows live delivery jobs in a matrix — service types down the side and UK pickup hubs across the top. Tap a cell to see every job in that area, sorted nearest drop-off first, with fuel and profit estimates.",
  },
  {
    question: "Is SignalsForMe free to use?",
    answer:
      "Yes. Pickup Radar, the driver planner, and eBay delivery quotes are free to browse. Create an account to save jobs and sync your van settings.",
  },
  {
    question: "Can I get a delivery quote before bidding on eBay?",
    answer:
      "Yes. Paste a collection-only eBay item link on Get a quote, enter your delivery postcode, and request driver quotes so you know the full cost before you bid.",
  },
  {
    question: "Which areas does SignalsForMe cover?",
    answer:
      "SignalsForMe indexes delivery jobs across the UK — London, Manchester, Birmingham, Leeds, Glasgow, Bristol, and dozens more pickup hubs.",
  },
] as const;

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "SignalsForMe",
    url: SITE_URL,
    description:
      "UK delivery job intelligence for drivers — find Shiply work by pickup location, plan routes, and estimate profit. eBay collection delivery quotes for buyers.",
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "SignalsForMe",
    url: SITE_URL,
    description: "Route Radar and delivery intelligence for UK drivers and eBay buyers.",
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
