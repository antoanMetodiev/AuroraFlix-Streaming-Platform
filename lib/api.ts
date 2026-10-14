import type { Movie } from "@/types/movie";
import type { Series } from "@/types/series";
import type { ActorLatestWork } from "@/types/actor";
import type { RecordFacts } from "@/types/facts";
import { API_BASE_URL } from "@/lib/config";
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

async function getJson<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
  { localized = true }: { localized?: boolean } = {}
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

    // The backend has no way to tell us when a title is added/updated (no webhooks,
    // no cache-invalidation hooks), and records can be added on demand from the
    // Order page — so any time-based cache here would show stale catalog data for
    // up to its revalidate window. Always hit the origin fresh instead.
    const response = await fetch(`${API_BASE_URL}${path}${query}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) return null;
    return (await response.json()) as T;
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
  const data = await getJson<unknown>("/get-trending-movies");
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
  const data = await getJson<unknown>("/get-trending-series");
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

export async function getMoviesDiscover(filters: DiscoverFilters, page: number): Promise<Movie[]> {
  const data = await getJson<unknown>("/discover-movies", discoverParams(filters, page));
  return unwrapList<Movie>(data);
}

export async function getSeriesDiscover(filters: DiscoverFilters, page: number): Promise<Series[]> {
  const data = await getJson<unknown>("/discover-series", discoverParams(filters, page));
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
  return getCount("/discover-movies-count", { genre: filters.genre, year: filters.year, actorName: filters.actor });
}

export async function getSeriesDiscoverCount(filters: DiscoverFilters): Promise<number> {
  return getCount("/discover-series-count", { genre: filters.genre, year: filters.year, actorName: filters.actor });
}

export async function searchMovies(title: string): Promise<Movie[]> {
  const data = await getJson<unknown>("/get-movies-by-title", { title });
  return unwrapList<Movie>(data);
}

export async function searchSeries(title: string): Promise<Series[]> {
  const data = await getJson<unknown>("/get-series-by-title", { title });
  return unwrapList<Series>(data);
}

async function getCount(path: string, params?: Record<string, string | number | undefined>): Promise<number> {
  const data = await getJson<number>(path, params);
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
