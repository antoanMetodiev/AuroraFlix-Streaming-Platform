import "server-only";

import type { MovieSubtitles } from "@/lib/movie-subtitles";

const SERIES_SUBTITLES_TAKER_URL =
  process.env.SERIES_SUBTITLES_TAKER_URL ??
  "https://lumo-series-subtitles-taker-svc.onrender.com";

/**
 * Our own Bulgarian subtitles for one episode, from
 * lumo-series-subtitles-taker-svc — same shape as a movie's, so the
 * /api/subtitles routes can share one response builder
 * (lib/subtitle-response.ts).
 */
export async function getEpisodeSubtitles(
  tmdbId: string,
  season: number,
  episode: number
): Promise<MovieSubtitles | null> {
  if (!tmdbId) {
    return null;
  }

  const label = `tmdbId=${tmdbId} season=${season} episode=${episode}`;

  try {
    const response = await fetch(
      `${SERIES_SUBTITLES_TAKER_URL}/get-subtitles/${encodeURIComponent(
        tmdbId
      )}/${season}/${episode}`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      }
    );

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      console.error(
        `series subtitle service returned ${response.status} for ${label}`
      );

      return null;
    }

    const data = (await response.json()) as Partial<
      MovieSubtitles & { season: number; episode: number }
    >;

    if (
      data.tmdbId !== tmdbId ||
      data.season !== season ||
      data.episode !== episode
    ) {
      console.error(
        `series subtitle service returned the wrong episode for ${label}: received tmdbId=${data.tmdbId} season=${data.season} episode=${data.episode}`
      );

      return null;
    }

    if (!data.subtitleFile && !data.subtitleTextUrl) {
      return null;
    }

    return {
      tmdbId: data.tmdbId,
      subtitleTextUrl: data.subtitleTextUrl ?? null,
      subtitleFile: data.subtitleFile ?? null,
    };
  } catch (error) {
    console.error(`series subtitle service request failed for ${label}`, error);

    return null;
  }
}
