import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/**
 * Everything public is crawlable; personal pages (account, lists, friends),
 * sign-in and the API aren't worth a crawl. Search result pages already say
 * noindex themselves.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/account", "/sign-in", "/sign-up", "/friends", "/watchlist", "/playlists"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
