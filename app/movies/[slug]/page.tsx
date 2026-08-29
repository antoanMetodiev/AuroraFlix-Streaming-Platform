import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { CinemaRecordDetailsPage } from "@/components/movies/cinema-record-details-page";
import { getMovieDetails } from "@/lib/api";
import {
  getMovieId,
  parseMovieIdFromSlug,
  tmdbImage,
} from "@/lib/tmdb";
import { getMovieSubtitles } from "@/lib/movie-subtitles";

async function loadMovie(slug: string) {
  const movieId =
    parseMovieIdFromSlug(slug);

  if (!movieId) {
    return null;
  }

  return getMovieDetails(movieId);
}

async function getAppOrigin() {
  const configuredOrigin =
    process.env.NEXT_PUBLIC_APP_URL;

  if (configuredOrigin) {
    return new URL(
      configuredOrigin
    ).origin;
  }

  const requestHeaders =
    await headers();

  const host =
    requestHeaders.get(
      "x-forwarded-host"
    ) ??
    requestHeaders.get("host");

  if (!host) {
    return null;
  }

  const protocol =
    requestHeaders.get(
      "x-forwarded-proto"
    ) ?? "https";

  return `${protocol}://${host}`;
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

  const tmdbId =
    getMovieId(movie);

  const [
    subtitles,
    appOrigin,
  ] = await Promise.all([
    getMovieSubtitles(tmdbId),
    getAppOrigin(),
  ]);

  const subtitleUrl =
    subtitles && appOrigin
      ? `${appOrigin}/api/subtitles/${encodeURIComponent(
          subtitles.tmdbId
        )}`
      : undefined;

  console.log(
    `[movie:${tmdbId}] subtitles:`,
    subtitles
      ? {
          hasSubtitleUrl:
            Boolean(
              subtitles.subtitleTextUrl
            ),
          hasSubtitleFile:
            Boolean(
              subtitles.subtitleFile
            ),
          playerSubtitleUrl:
            subtitleUrl ?? null,
        }
      : null
  );

  return (
    <CinemaRecordDetailsPage
      record={movie}
      type="movie"
      subtitleUrl={subtitleUrl}
    />
  );
}
