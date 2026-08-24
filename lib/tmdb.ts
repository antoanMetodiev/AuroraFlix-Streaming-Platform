const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

export type TmdbImageSize = "w342" | "w500" | "w780" | "w1280" | "original";

export function tmdbImage(path?: string | null, size: TmdbImageSize = "w780") {
  if (!path) return null;
  return path.startsWith("http") ? path : `${TMDB_IMAGE_BASE}/${size}${path}`;
}

/**
 * Movie list/search/details endpoints don't return a `movieId` field — only the
 * trending-movies endpoint does. Everywhere else the id has to be pulled from the
 * trailing number in `videoURL` (e.g. ".../embed/movie/1064213" -> "1064213").
 */
function extractIdFromVideoUrl(videoURL?: string | null): string | null {
  if (!videoURL) return null;
  const match = videoURL.match(/\/(\d+)$/);
  return match ? match[1] : null;
}

export function getMovieSlug(movie: { title: string; movieId?: string | null; videoURL?: string | null }) {
  const id = movie.movieId ?? extractIdFromVideoUrl(movie.videoURL) ?? "";
  return `${encodeURIComponent(movie.title)}-${id}`;
}

export function parseMovieIdFromSlug(slug: string) {
  const parts = decodeURIComponent(slug).split("-");
  return parts[parts.length - 1] ?? "";
}
