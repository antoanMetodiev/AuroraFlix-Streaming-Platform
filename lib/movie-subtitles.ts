import "server-only";

const SUBTITLES_TAKER_URL =
  process.env.SUBTITLES_TAKER_URL ??
  "https://lumo-movies-subtitles-taker-svc.onrender.com";

export type MovieSubtitles = {
  tmdbId: string;
  subtitleTextUrl: string | null;
  subtitleFile: string | null;
};

export async function getMovieSubtitles(
  tmdbId: string
): Promise<MovieSubtitles | null> {
  if (!tmdbId) {
    return null;
  }

  try {
    const response = await fetch(
      `${SUBTITLES_TAKER_URL}/get-subtitles/${encodeURIComponent(
        tmdbId
      )}`,
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
        `subtitle service returned ${response.status} for tmdbId=${tmdbId}`
      );

      return null;
    }

    const data =
      (await response.json()) as Partial<MovieSubtitles>;

    if (data.tmdbId !== tmdbId) {
      console.error(
        `subtitle service returned wrong tmdbId: expected=${tmdbId}, received=${data.tmdbId}`
      );

      return null;
    }

    if (
      !data.subtitleFile &&
      !data.subtitleTextUrl
    ) {
      return null;
    }

    return {
      tmdbId: data.tmdbId,
      subtitleTextUrl:
        data.subtitleTextUrl ?? null,
      subtitleFile:
        data.subtitleFile ?? null,
    };
  } catch (error) {
    console.error(
      `subtitle service request failed for tmdbId=${tmdbId}`,
      error
    );

    return null;
  }
}
