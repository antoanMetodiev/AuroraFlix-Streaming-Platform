import type { Movie } from "@/types/movie";
import type { Series } from "@/types/series";
import type { Actor, ActorLatestWork } from "@/types/actor";

/**
 * Same-origin proxy (see app/api/backend/[...path]/route.ts) for the handful of
 * calls that genuinely happen client-side. The gateway's Origin allowlist covers
 * the old Vite dev server and production, not this app, so a direct browser
 * fetch to the gateway gets a 403 — routing through our own API sidesteps that
 * entirely, since server-to-server requests carry no Origin header.
 */
const PROXY_BASE_URL = "/api/backend";

// limit/offset let a caller page through more than one screenful of matches
// (see components/playlists/playlist-card.tsx's "Load more") instead of
// being stuck with the backend's default page size.
export async function searchMatchingMovies(title: string, signal?: AbortSignal, limit = 10, offset = 0): Promise<Movie[]> {
  if (!title.trim()) return [];
  const response = await fetch(`${PROXY_BASE_URL}/search-movies-matching-results/${encodeURIComponent(title)}?limit=${limit}&offset=${offset}`, {
    signal,
  });
  if (!response.ok) return [];
  return (await response.json()) as Movie[];
}

export async function searchMatchingSeries(title: string, signal?: AbortSignal, limit = 10, offset = 0): Promise<Series[]> {
  if (!title.trim()) return [];
  const response = await fetch(`${PROXY_BASE_URL}/search-series-matching-results/${encodeURIComponent(title)}?limit=${limit}&offset=${offset}`, {
    signal,
  });
  if (!response.ok) return [];
  return (await response.json()) as Series[];
}

// Session-lifetime cache for the hover-preview card (see
// components/movies/cinema-record-card.tsx) — the same title gets hovered
// repeatedly as someone scans a grid, and this data doesn't change while
// browsing, so there's no reason to re-fetch it every time.
const moviePreviewCache = new Map<string, Promise<Movie | null>>();
const seriesPreviewCache = new Map<string, Promise<Series | null>>();

export function getMoviePreview(movieId: string): Promise<Movie | null> {
  if (!movieId) return Promise.resolve(null);
  let cached = moviePreviewCache.get(movieId);
  if (!cached) {
    cached = fetch(`${PROXY_BASE_URL}/get-movie-details?movieId=${encodeURIComponent(movieId)}`)
      .then((response) => (response.ok ? (response.json() as Promise<Movie>) : null))
      .catch(() => null);
    moviePreviewCache.set(movieId, cached);
  }
  return cached;
}

export function getSeriesPreview(id: string): Promise<Series | null> {
  if (!id) return Promise.resolve(null);
  let cached = seriesPreviewCache.get(id);
  if (!cached) {
    cached = fetch(`${PROXY_BASE_URL}/get-series-details?id=${encodeURIComponent(id)}`)
      .then((response) => (response.ok ? (response.json() as Promise<Series>) : null))
      .catch(() => null);
    seriesPreviewCache.set(id, cached);
  }
  return cached;
}

export async function suggestActors(type: "movie" | "series", query: string, signal?: AbortSignal): Promise<Actor[]> {
  if (!query.trim()) return [];
  const path = type === "movie" ? "suggest-movie-actors" : "suggest-series-actors";
  const response = await fetch(`${PROXY_BASE_URL}/${path}?query=${encodeURIComponent(query)}`, { signal });
  if (!response.ok) return [];
  return (await response.json()) as Actor[];
}

export async function checkForNewEpisodes(id: string, title: string) {
  await fetch(`${PROXY_BASE_URL}/check-for-new-episodes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, title }),
  });
}

export async function requestMoreMoviesForActor(imdbId: string) {
  await fetch(`${PROXY_BASE_URL}/add-movies-by-actor/${encodeURIComponent(imdbId)}`, { method: "POST" });
}

export async function getActorLatestWorksClient(imdbId: string): Promise<ActorLatestWork[]> {
  const response = await fetch(`${PROXY_BASE_URL}/actor/latest-works/${encodeURIComponent(imdbId)}`);
  if (!response.ok) return [];
  return (await response.json()) as ActorLatestWork[];
}

async function requestRecord(path: string, recordName: string): Promise<boolean> {
  const response = await fetch(`${PROXY_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recordName }),
  });
  return response.ok;
}

export const orderMovie = (recordName: string) => requestRecord("/search-movies", recordName);
export const orderSeries = (recordName: string) => requestRecord("/search-series", recordName);
