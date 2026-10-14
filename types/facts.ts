/** A title's facts panel from TMDB (GET /get-movie-facts, /get-series-facts). */
export type RecordFacts = {
  originalTitle?: string | null;
  originalLanguage?: string | null;
  budget?: number | null;
  revenue?: number | null;
  homepage?: string | null;
  imdbId?: string | null;
  wikidataId?: string | null;
  facebookId?: string | null;
  instagramId?: string | null;
  twitterId?: string | null;
  tiktokId?: string | null;
  youtubeId?: string | null;
  /** Featured crew: directors / writers (a series' creators), with their jobs. */
  crew?: { id: number; name: string; jobs: string[]; profilePath?: string | null }[] | null;
  networks?: string[] | null;
};
