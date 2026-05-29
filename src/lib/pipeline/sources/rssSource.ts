import type { RawItem } from "@/lib/types";

// Real, dependency-free RSS/Atom adapter. Demonstrates how live sources plug in:
// each source just needs to return RawItem[]. Add more adapters (Companies House
// API, gov tender portals, job board APIs) the same way.
export async function fetchRssItems(feedUrl: string): Promise<RawItem[]> {
  try {
    const res = await fetch(feedUrl, {
      headers: { "User-Agent": "SignalsForMe/0.1 (+https://signalsforme.app)" },
      // revalidate hourly when used inside Next
      next: { revalidate: 3600 },
    } as RequestInit);
    if (!res.ok) return [];
    const xml = await res.text();
    return parseFeed(xml);
  } catch {
    return [];
  }
}

function parseFeed(xml: string): RawItem[] {
  const items: RawItem[] = [];
  const blocks = xml.match(/<(item|entry)[\s\S]*?<\/(item|entry)>/g) ?? [];
  for (const block of blocks) {
    const title = strip(pick(block, "title"));
    const desc = strip(pick(block, "description") || pick(block, "summary") || pick(block, "content"));
    const link = strip(pick(block, "link"));
    if (!title) continue;
    items.push({
      title,
      content: desc || title,
      url: link || undefined,
      source: "news",
    });
  }
  return items;
}

function pick(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return m ? m[1] : "";
}

function strip(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();
}
