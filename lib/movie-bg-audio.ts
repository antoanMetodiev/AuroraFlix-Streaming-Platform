import "server-only";

const SUBTITLES_TAKER_URL =
  process.env.SUBTITLES_TAKER_URL ??
  "https://lumo-movies-subtitles-taker-svc.onrender.com";

/**
 * The stream our own "БГ аудио" player plays: ZenoPlay's VidHide HLS for
 * the movie, resolved fresh by lumo-movies-subtitles-taker-svc (the links are
 * signed and expire after ~36 h). `audioLanguages` is what its master
 * playlist lists, e.g. ["bg", "en"] — empty when the stream has a single,
 * unlabelled audio track (then that track is the dub).
 */
export type MovieBgAudio = {
  tmdbId: string;
  masterUrl: string;
  audioLanguages: string[];
};

export async function getMovieBgAudio(tmdbId: string): Promise<MovieBgAudio | null> {
  if (!tmdbId) return null;

  try {
    const response = await fetch(`${SUBTITLES_TAKER_URL}/get-bg-audio/${encodeURIComponent(tmdbId)}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    });

    if (response.status === 404) return null;
    if (!response.ok) {
      console.error(`bg-audio service returned ${response.status} for tmdbId=${tmdbId}`);
      return null;
    }

    const data = (await response.json()) as Partial<MovieBgAudio>;
    if (data.tmdbId !== tmdbId || !data.masterUrl) return null;

    return {
      tmdbId,
      masterUrl: data.masterUrl,
      audioLanguages: Array.isArray(data.audioLanguages) ? data.audioLanguages : [],
    };
  } catch (error) {
    console.error(`bg-audio service request failed for tmdbId=${tmdbId}`, error);
    return null;
  }
}
