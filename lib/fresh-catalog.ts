/**
 * Set in the browser right after a successful order (Order page): while it
 * lives, lib/api.ts skips the edge cache for this visitor, so the title they
 * just ordered shows up in /movies and /series as soon as the generator has
 * added it — not up to a cache TTL later. Their fresh responses are written
 * back to the cache too, so everyone else sees it right away on those pages.
 *
 * 10 minutes: covers the generator's few seconds plus a while of browsing.
 */
export const FRESH_CATALOG_COOKIE = "aurora_fresh_catalog";
const FRESH_CATALOG_MAX_AGE_S = 10 * 60;

export function markCatalogFresh() {
  document.cookie = `${FRESH_CATALOG_COOKIE}=1; max-age=${FRESH_CATALOG_MAX_AGE_S}; path=/; samesite=lax`;
}
