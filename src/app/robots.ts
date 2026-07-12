import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/onboarding",
        "/login",
        "/verify",
        "/admin",
        "/dashboard",
        "/matrix",
        "/planner",
        "/quotes",
        "/opportunities",
        "/jobs",
        "/delivery-jobs",
        "/favourites",
        "/van-settings",
        "/ideas",
        "/submit",
        "/need",
        "/legacy",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
