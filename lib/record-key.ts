import { getMovieId } from "@/lib/tmdb";
import type { Movie } from "@/types/movie";
import type { Series } from "@/types/series";

/**
 * The one identity a movie/series record is known by across every personal
 * list — watchlist, likes, playlists — and the value stored as `recordId`.
 *
 * It has to be the TMDB id, not `record.id`: the same title arrives with
 * different `id` values depending on which table it was read from. A movie
 * on the homepage hero comes from `trending_movies` and carries that
 * table's own uuid; the same movie on its details page comes from `movies`
 * and carries a different one. Keying off `record.id` therefore let the
 * same title be saved twice — once from the hero, once from the details
 * page — with neither place seeing the other's entry (reported for the
 * series "Reacher"). The TMDB id is stable across all of them, and is
 * already what the app uses to address a title in its URLs.
 *
 * Movies go through getMovieId() rather than reading `tmdbId` directly
 * because some catalog rows predate the tmdb_id backfill and still only
 * carry it in the trailing segment of videoURL. Series always have their
 * own tmdbId (it is `series`' own unique key).
 */
export function getRecordKey(record: Movie | Series, type: "movie" | "series"): string {
  if (type === "series") return (record as Series).tmdbId ?? "";
  return getMovieId(record as Movie);
}
