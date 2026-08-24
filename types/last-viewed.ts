export type LastViewed = {
  type: "MOVIE" | "SERIES";
  tmdbId?: string | null;
  seriesId?: string;
  posterURL?: string | null;
  title: string;
  tmdbRating: string;
  videoURL?: string | null;
  releaseDate: string;
};
