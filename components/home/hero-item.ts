import type { Movie } from "@/types/movie";
import type { Series } from "@/types/series";

/**
 * One entry in the homepage hero carousel, which mixes trending movies and
 * trending series.
 *
 * The type is carried explicitly rather than sniffed with series.ts's
 * `isSeries()` helper: that checks for an `allEpisodes` field, which the
 * trending endpoints don't return (they serve the slim trending_movies /
 * trending_series rows, not full catalog records), so every entry would
 * look like a movie. It also decides the detail href and the genre-link
 * base, both of which differ per type.
 */
export type HeroItem = { record: Movie; type: "movie" } | { record: Series; type: "series" };
