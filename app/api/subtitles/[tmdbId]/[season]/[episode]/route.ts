import { getEpisodeSubtitles } from "@/lib/series-subtitles";
import {
  subtitleOptionsResponse,
  subtitleResponse,
} from "@/lib/subtitle-response";

export const runtime = "nodejs";

/**
 * One episode's Bulgarian subtitles — the series twin of
 * /api/subtitles/[tmdbId] (movies), backed by lumo-series-subtitles-taker-svc.
 */
export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      tmdbId: string;
      season: string;
      episode: string;
    }>;
  }
) {
  const { tmdbId, season, episode } = await params;
  const seasonNumber = Number(season);
  const episodeNumber = Number(episode);

  if (
    !tmdbId ||
    !Number.isInteger(seasonNumber) ||
    !Number.isInteger(episodeNumber) ||
    seasonNumber < 0 ||
    episodeNumber < 0
  ) {
    return new Response("Invalid tmdbId, season or episode", { status: 400 });
  }

  return subtitleResponse(
    await getEpisodeSubtitles(tmdbId, seasonNumber, episodeNumber),
    `tmdbId=${tmdbId} season=${seasonNumber} episode=${episodeNumber}`
  );
}

export function OPTIONS() {
  return subtitleOptionsResponse();
}
