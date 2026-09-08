import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CinemaRecordDetailsPage } from "@/components/movies/cinema-record-details-page";
import { getMovieDetails } from "@/lib/api";
import {
  parseMovieIdFromSlug,
  tmdbImage,
} from "@/lib/tmdb";

async function loadMovie(slug: string) {
  const movieId =
    parseMovieIdFromSlug(slug);

  if (!movieId) {
    return null;
  }

  return getMovieDetails(movieId);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{
    slug: string;
  }>;
}): Promise<Metadata> {
  const { slug } =
    await params;

  const movie =
    await loadMovie(slug);

  if (!movie) {
    return {
      title: "Movie not found",
    };
  }

  const backdrop =
    tmdbImage(
      movie.backgroundImg_URL,
      "w1280"
    );

  return {
    title: movie.title,

    description:
      movie.description ??
      `Watch ${movie.title} on AuroraFlix.`,

    openGraph: {
      title: movie.title,

      description:
        movie.description ??
        undefined,

      images: backdrop
        ? [{ url: backdrop }]
        : undefined,
    },
  };
}

export default async function MovieDetailsPage({
  params,
}: {
  params: Promise<{
    slug: string;
  }>;
}) {
  const { slug } =
    await params;

  const movie =
    await loadMovie(slug);

  if (!movie) {
    notFound();
  }

  // Subtitles are no longer fetched here. This used to await
  // getMovieSubtitles(tmdbId) — a call to the (external, Render free-tier)
  // subtitles-taker service — before returning any HTML at all. When that
  // service was slow or down, its 10s AbortSignal.timeout blocked the whole
  // page for the full 10 seconds on every single load. PlayerSection now
  // checks for subtitles itself, client-side, in the background, after the
  // player has already rendered — see its own effect for the doc comment.
  return (
    <CinemaRecordDetailsPage
      record={movie}
      type="movie"
    />
  );
}
