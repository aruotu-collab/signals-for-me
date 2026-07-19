import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/flip`, changeFrequency: "hourly", priority: 0.95 },
    { url: `${SITE_URL}/source`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/flip?category=Watches`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/flip?category=Phones`, changeFrequency: "hourly", priority: 0.85 },
    { url: `${SITE_URL}/flip?category=Laptops`, changeFrequency: "hourly", priority: 0.85 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
