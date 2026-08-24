export type Episode = {
  id: string;
  videoURL: string;
  posterImgURL?: string | null;
  episodeTitle?: string | null;
  airDate?: string | null;
  description?: string | null;
  runtime?: string | null;
  tmdbRating?: string | null;
  season?: string | null;
  episodeNumber?: string | null;
  player2URL?: string | null;
  videoURLs?: string[];
};
