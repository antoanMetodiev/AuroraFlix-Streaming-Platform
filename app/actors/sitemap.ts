import type { MetadataRoute } from "next";
import { getSitemapActorIds } from "@/lib/api";
import { SITE_URL } from "@/lib/seo";

// /actors/sitemap.xml — the server-rendered actor pages (/actors/{imdbId}),
// a separate file from /sitemap.xml so the main one stays small. Listed in
// robots.txt. Built per request like the main sitemap (and never at build
// time), from the gateway's list of actors with 2+ titles.
export const dynamic = "force-dynamic";

// Google reads at most 50,000 URLs per sitemap file. The list comes
// best-known first, so if the catalog ever grows past this, the tail is what
// gets cut — then it's time for generateSitemaps (split files).
const MAX_URLS = 45_000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const ids = await getSitemapActorIds();
  return ids.slice(0, MAX_URLS).map((id) => ({
    url: `${SITE_URL}/actors/${id}`,
    changeFrequency: "weekly",
    priority: 0.6,
  }));
}
