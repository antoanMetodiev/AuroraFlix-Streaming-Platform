/**
 * A record's `genres` column ("Drama, Crime") as a list. Some series rows
 * store genres as `"Drama".` — the quotes/dot are stripped.
 */
export function parseGenres(genres: string | null | undefined): string[] {
  return genres
    ? genres
        .split(",")
        .map((genre) => genre.trim().replace(/^["']+|["'.]+$/g, ""))
        .filter(Boolean)
    : [];
}

export const ALL_GENRES = [
  "Action", "Horror", "Comedy", "Drama", "Mystery", "Romance", "Adventure", "Crime",
  "Fantasy", "Historical", "Animation", "Thriller", "Western", "Biography",
  "Documentary", "Family", "Musical", "Sports", "War",
];
