export type Actor = {
  id: string;
  imageURL?: string | null;
  biography?: string | null;
  facebookUsername?: string | null;
  instagramUsername?: string | null;
  twitterUsername?: string | null;
  youtubeChannel?: string | null;
  imdbId?: string | null;
  birthday?: string | null;
  knownFor?: string | null;
  placeOfBirth?: string | null;
  gender?: string | null;
  popularity?: string | null;
  nameInRealLife: string;
};

export type ActorLatestWork = {
  seriesId?: string | null;
  tmdbId?: string | null;
  videoURL?: string | null;
  title?: string | null;
  // Backend mirrors the Java DTO's all-caps "TYPE" Jackson property (see
  // lumo-movies-svc/series-svc models.go), not "type".
  TYPE: "MOVIE" | "SERIES" | string;
  name_in_real_life: string;
  posterURL: string;
  tmdbRating: string;
};
