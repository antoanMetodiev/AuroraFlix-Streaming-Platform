import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CinemaRecordDetailsPage } from "@/components/movies/cinema-record-details-page";
import { getMovieDetails } from "@/lib/api";
import { jsonLdHtml, recordJsonLd, recordMetadata } from "@/lib/seo";
import {
  getMovieSlug,
  parseMovieIdFromSlug,
} from "@/lib/tmdb";

// cache(): generateMetadata and the page below both need the movie — one
// backend call per request instead of two.
const loadMovie = cache(async (slug: string) => {
  const movieId =
    parseMovieIdFromSlug(slug);

  if (!movieId) {
    return null;
  }

  return getMovieDetails(movieId);
});

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
      title: "Филмът не е намерен",
      robots: { index: false },
    };
  }

  return recordMetadata(
    movie,
    "movie",
    `/movies/${getMovieSlug({ ...movie, movieId: parseMovieIdFromSlug(slug) })}`
  );
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
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdHtml(
          recordJsonLd(
            movie,
            "movie",
            `/movies/${getMovieSlug({ ...movie, movieId: parseMovieIdFromSlug(slug) })}`
          )
        )}
      />
      <CinemaRecordDetailsPage
        record={movie}
        type="movie"
      />
    </>
  );
}
