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

export async function searchMatchingMovies(title: string, signal?: AbortSignal): Promise<Movie[]> {
  if (!title.trim()) return [];
  const response = await fetch(`${PROXY_BASE_URL}/search-movies-matching-results/${encodeURIComponent(title)}`, { signal });
  if (!response.ok) return [];
  return (await response.json()) as Movie[];
}

export async function searchMatchingSeries(title: string, signal?: AbortSignal): Promise<Series[]> {
  if (!title.trim()) return [];
  const response = await fetch(`${PROXY_BASE_URL}/search-series-matching-results/${encodeURIComponent(title)}`, { signal });
  if (!response.ok) return [];
  return (await response.json()) as Series[];
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
