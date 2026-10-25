import type { Movie } from "@/types/movie";
import type { Series } from "@/types/series";
import type { ActorLatestWork } from "@/types/actor";
import type { RecordFacts } from "@/types/facts";
import { API_BASE_URL } from "@/lib/config";
import { cookies } from "next/headers";
import { FRESH_CATALOG_COOKIE } from "@/lib/fresh-catalog";
import { getRequestLocale } from "@/lib/i18n/request-locale";

/**
 * Asks for the visitor's language (?lang=bg|el|es — see getRequestLocale):
 * the movies / series services then answer with that language's titles,
 * descriptions, posters and trailers where TMDB has them, and the English
 * title in `originalTitle`. English needs no parameter. Off for the sitemap,
 * which only needs ids and the (English, URL-building) titles.
 */
async function languageParam(localized: boolean): Promise<{ lang?: string }> {
  if (!localized) return {};
  try {
    const locale = await getRequestLocale();
    return locale === "en" ? {} : { lang: locale };
  } catch {
    // Outside a request (nothing to read the language from).
    return {};
  }
}

/**
 * How long (seconds) curated rows stay cached: trending (the generators
 * refresh it once a day) and the top-rated picks behind the homepage's
 * "Popular" and the details page's "Similar titles".
 */
export const CURATED_CACHE_TTL_S = 30 * 60;

/**
 * How long (seconds) the /movies and /series listings (and their counts)
 * stay cached. Whoever orders a title bypasses this (lib/fresh-catalog.ts),
 * so it's only how long other visitors may wait to see a new arrival on a
 * page nobody has refreshed.
 */
const LISTING_CACHE_TTL_S = 5 * 60;

/** The Worker's edge cache (Cloudflare Cache API); absent under `next dev`. */
function edgeCache(): Cache | null {
  const storage = (globalThis as { caches?: CacheStorage & { default?: Cache } }).caches;
  return storage?.default ?? null;
}

/** Whether this visitor just ordered a title — see lib/fresh-catalog.ts. */
async function wantsFreshCatalog(): Promise<boolean> {
  try {
    return (await cookies()).has(FRESH_CATALOG_COOKIE);
  } catch {
    // Outside a request (nothing to read the cookie from).
    return false;
  }
}

/** An empty list is often a downstream hiccup, not real data — never worth caching. */
function isEmptyList(data: unknown): boolean {
  if (Array.isArray(data)) return data.length === 0;
  const value = (data as { value?: unknown } | null)?.value;
  return Array.isArray(value) && value.length === 0;
}

async function getJson<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
  { localized = true, cacheTtl }: { localized?: boolean; cacheTtl?: number } = {}
): Promise<T | null> {
  try {
    params = { ...params, ...(await languageParam(localized)) };
    const query = params
      ? "?" +
        new URLSearchParams(
          Object.entries(params).filter((entry): entry is [string, string | number] => entry[1] !== undefined)
            .map(([key, value]) => [key, String(value)])
        ).toString()
      : "";

    const url = `${API_BASE_URL}${path}${query}`;

    // The backend has no way to tell us when a title is added/updated (no
    // webhooks, no cache-invalidation hooks), so by default every call hits the
    // origin fresh — details pages and search always do. Only calls that opt in
    // with a cacheTtl (trending, popular, listings) are kept in the Worker's
    // edge cache, keyed by the full URL (so per language and per filter), and
    // stale data there lasts at most that long. Also spares visitors a wait on
    // the Render gateway's cold start for most homepage / listing views.
    // Someone who just ordered a title reads past the cache (and refreshes it
    // with what they get) — see lib/fresh-catalog.ts.
    const cache = cacheTtl ? edgeCache() : null;
    if (cache && !(await wantsFreshCatalog())) {
      const hit = await cache.match(url).catch(() => undefined);
      if (hit) return (await hit.json()) as T;
    }

    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) return null;
    const data = (await response.json()) as T;

    if (cache && !isEmptyList(data)) {
      // A fresh Response, so none of the origin's own headers (no-store,
      // Set-Cookie) can keep it out of the cache.
      await cache
        .put(
          url,
          new Response(JSON.stringify(data), {
            headers: { "Content-Type": "application/json", "Cache-Control": `public, max-age=${cacheTtl}` },
          })
        )
        .catch(() => {});
    }
    return data;
  } catch {
    return null;
  }
}

function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && Array.isArray((data as { value?: unknown }).value)) {
    return (data as { value: T[] }).value;
  }
  return [];
}

/**
 * The gateway sometimes wraps collections as `{ value: T[], Count: number }`
 * (OData-style) and sometimes returns a bare array, so both shapes are handled.
 */
export async function getTrendingMovies(): Promise<Movie[]> {
  const data = await getJson<unknown>("/get-trending-movies", undefined, { cacheTtl: CURATED_CACHE_TTL_S });
  return unwrapList<Movie>(data);
}

/**
 * Series counterpart of getTrendingMovies, backed by lumo-series-svc's own
 * trending_series table (added alongside this — the shape matches
 * TrendingMovie field for field, including the hero-only trailerVideoURL /
 * logoURL). Returns the slim trending rows, not full catalog Series: no
 * castList/allEpisodes/imagesList, which the homepage hero doesn't read.
 */
export async function getTrendingSeries(): Promise<Series[]> {
  const data = await getJson<unknown>("/get-trending-series", undefined, { cacheTtl: CURATED_CACHE_TTL_S });
  return unwrapList<Series>(data);
}

const PAGE_SIZE = 30;

export type SortOption = "newest" | "oldest" | "top_rated";

export type DiscoverFilters = {
  genre?: string;
  year?: string;
  actor?: string;
  sort?: SortOption;
};

function discoverParams(filters: DiscoverFilters, page: number) {
  return {
    genre: filters.genre,
    year: filters.year,
    actorName: filters.actor,
    sort: filters.sort,
    page: page - 1,
    size: PAGE_SIZE,
  };
}

/** `cacheTtl` defaults to the listing one; curated sections pass CURATED_CACHE_TTL_S. */
export async function getMoviesDiscover(filters: DiscoverFilters, page: number, cacheTtl = LISTING_CACHE_TTL_S): Promise<Movie[]> {
  const data = await getJson<unknown>("/discover-movies", discoverParams(filters, page), { cacheTtl });
  return unwrapList<Movie>(data);
}

export async function getSeriesDiscover(filters: DiscoverFilters, page: number, cacheTtl = LISTING_CACHE_TTL_S): Promise<Series[]> {
  const data = await getJson<unknown>("/discover-series", discoverParams(filters, page), { cacheTtl });
  return unwrapList<Series>(data);
}

/**
 * The whole catalog in one request each (slim rows: title/ids/date only) —
 * for app/sitemap.ts. The discover endpoints take any page size; 10,000 is
 * comfortably above the catalog (≈4,800 movies, ≈700 series as of
 * 2026-10-14) while still well under the 50,000-URL limit of one sitemap.
 */
const SITEMAP_PAGE_SIZE = 10_000;

export async function getAllMovies(): Promise<Movie[]> {
  const data = await getJson<unknown>("/discover-movies", { page: 0, size: SITEMAP_PAGE_SIZE }, { localized: false });
  return unwrapList<Movie>(data);
}

export async function getAllSeries(): Promise<Series[]> {
  const data = await getJson<unknown>("/discover-series", { page: 0, size: SITEMAP_PAGE_SIZE }, { localized: false });
  return unwrapList<Series>(data);
}

export async function getMoviesDiscoverCount(filters: DiscoverFilters): Promise<number> {
  return getCount("/discover-movies-count", { genre: filters.genre, year: filters.year, actorName: filters.actor }, LISTING_CACHE_TTL_S);
}

export async function getSeriesDiscoverCount(filters: DiscoverFilters): Promise<number> {
  return getCount("/discover-series-count", { genre: filters.genre, year: filters.year, actorName: filters.actor }, LISTING_CACHE_TTL_S);
}

export async function searchMovies(title: string): Promise<Movie[]> {
  const data = await getJson<unknown>("/get-movies-by-title", { title });
  return unwrapList<Movie>(data);
}

export async function searchSeries(title: string): Promise<Series[]> {
  const data = await getJson<unknown>("/get-series-by-title", { title });
  return unwrapList<Series>(data);
}

async function getCount(
  path: string,
  params?: Record<string, string | number | undefined>,
  cacheTtl?: number
): Promise<number> {
  const data = await getJson<number>(path, params, { cacheTtl });
  return typeof data === "number" ? data : 0;
}

export const getSearchedMoviesCount = (title: string) => getCount("/get-searched-movies-count", { title });
export const getSearchedSeriesCount = (title: string) => getCount("/get-searched-series-count", { title });

export async function getMovieDetails(movieId: string): Promise<Movie | null> {
  if (!movieId) return null;
  return getJson<Movie>("/get-movie-details", { movieId });
}

export async function getSeriesDetails(id: string): Promise<Series | null> {
  if (!id) return null;
  return getJson<Series>("/get-series-details", { id });
}

export async function getActorLatestWorks(imdbId: string): Promise<ActorLatestWork[]> {
  const data = await getJson<unknown>(`/actor/latest-works/${encodeURIComponent(imdbId)}`);
  return unwrapList<ActorLatestWork>(data);
}

/** A movie's / series' facts panel (original title and language, budget, crew, social pages). */
export async function getRecordFacts(type: "movie" | "series", tmdbId: string | null | undefined): Promise<RecordFacts | null> {
  if (!tmdbId) return null;
  return getJson<RecordFacts>(type === "movie" ? "/get-movie-facts" : "/get-series-facts", { tmdbId }, { localized: false });
}
