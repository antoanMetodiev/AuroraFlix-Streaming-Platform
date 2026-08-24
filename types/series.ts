import type { Actor } from "./actor";
import type { Episode } from "./episode";
import type { MediaImage } from "./media-image";
import type { Movie } from "./movie";

export type Series = {
  id: string;
  tmdbId: string;
  title: string;
  description?: string | null;
  specialText?: string | null;
  genres?: string | null;
  releaseDate?: string | null;
  tmdbRating: string;
  posterImgURL?: string | null;
  backgroundImg_URL?: string | null;
  trailerURL?: string | null;
  videoURL?: string | null;
  player2URL?: string | null;
  videoURLs?: string[];
  castList?: Actor[];
  allEpisodes?: Episode[];
  imagesList?: MediaImage[];
};

export type CinemaRecord = Movie | Series;

export function isSeries(record: CinemaRecord): record is Series {
  return "allEpisodes" in record;
}
