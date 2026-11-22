import { getTrendingMovies, getTrendingSeries } from "@/lib/api";
import { getMovieId } from "@/lib/tmdb";

/**
 * Today's trending position of each title, by TMDB id ("№3 днес" badge on
 * the list cards). The trending endpoints list #1 last (see app/page.tsx's
 * toShowcaseItems), so the rank counts down from the end. Same cached calls
 * the homepage makes; an empty map when the service is down.
 */
export async function getTrendingRanks(type: "movie" | "series"): Promise<Record<string, number>> {
  const records = type === "movie" ? await getTrendingMovies() : await getTrendingSeries();
  const ranks: Record<string, number> = {};
  records.forEach((record, index) => {
    const id = type === "movie" ? getMovieId(record) : record.tmdbId;
    if (id) ranks[id] = records.length - index;
  });
  return ranks;
}
