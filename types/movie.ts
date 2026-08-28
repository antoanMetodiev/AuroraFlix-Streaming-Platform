import type { Actor } from "./actor";
import type { MediaImage } from "./media-image";

export type Movie = {
  id: string;
  movieId?: string | null;
  tmdbId?: string | null;
  title: string;
  description?: string | null;
  specialText?: string | null;
  genres?: string | null;
  releaseDate?: string | null;
  tmdbRating: string;
  posterImgURL?: string | null;
  backgroundImg_URL?: string | null;
  trailerURL?: string | null;
  trailerVideoURL?: string | null;
  logoURL?: string | null;
  videoURL?: string | null;
  vidmPlayer?: string | null;
  player2URL?: string | null;
  videoURLs?: string[];
  castList?: Actor[];
  imagesList?: MediaImage[];
};
