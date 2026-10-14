import type { MetadataRoute } from "next";
import { getAllMovies, getAllSeries } from "@/lib/api";
import { ALL_GENRES } from "@/lib/genres";
import { SITE_URL } from "@/lib/seo";
import { getMovieSlug, tmdbImage } from "@/lib/tmdb";

// Built on every request from the live catalog — titles are added on demand
// (Order page, "check for new episodes"), and there's no hook to tell us
// when. Googlebot only fetches it now and then, so that's two backend calls
// per crawl, not per visitor. Also keeps `next build` from depending on the
// backend being up.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [movies, series] = await Promise.all([getAllMovies(), getAllSeries()]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/movies`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/series`, changeFrequency: "daily", priority: 0.9 },
    ...ALL_GENRES.flatMap((genre): MetadataRoute.Sitemap => [
      { url: `${SITE_URL}/movies/genres/${encodeURIComponent(genre)}`, changeFrequency: "daily", priority: 0.7 },
      { url: `${SITE_URL}/series/genres/${encodeURIComponent(genre)}`, changeFrequency: "daily", priority: 0.7 },
    ]),
  ];

  const moviePages: MetadataRoute.Sitemap = movies
    .filter((movie) => movie.title && (movie.tmdbId || movie.videoURL))
    .map((movie) => {
      const poster = tmdbImage(movie.posterImgURL, "w500");
      return {
        url: `${SITE_URL}/movies/${getMovieSlug(movie)}`,
        changeFrequency: "weekly",
        priority: 0.8,
        images: poster ? [poster] : undefined,
      };
    });

  const seriesPages: MetadataRoute.Sitemap = series
    .filter((record) => record.tmdbId)
    .map((record) => {
      const poster = tmdbImage(record.posterImgURL, "w500");
      return {
        url: `${SITE_URL}/series/${record.tmdbId}`,
        changeFrequency: "weekly",
        priority: 0.8,
        images: poster ? [poster] : undefined,
      };
    });

  return [...staticPages, ...moviePages, ...seriesPages];
}
