"use client";

import { useEffect } from "react";
import { useLastViewed } from "@/lib/use-last-viewed";
import type { Movie } from "@/types/movie";
import type { Series } from "@/types/series";

export function TrackLastViewed({ record, type }: { record: Movie | Series; type: "movie" | "series" }) {
  const { record: recordView } = useLastViewed();

  useEffect(() => {
    recordView({
      type: type === "movie" ? "MOVIE" : "SERIES",
      tmdbId: record.tmdbId,
      seriesId: type === "series" ? record.id : undefined,
      posterURL: record.posterImgURL,
      title: record.title,
      tmdbRating: record.tmdbRating,
      videoURL: record.videoURL,
      releaseDate: record.releaseDate ?? "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record.id]);

  return null;
}
