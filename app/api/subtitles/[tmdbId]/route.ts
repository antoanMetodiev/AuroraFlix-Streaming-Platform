import { getMovieSubtitles } from "@/lib/movie-subtitles";
import {
  subtitleOptionsResponse,
  subtitleResponse,
} from "@/lib/subtitle-response";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      tmdbId: string;
    }>;
  }
) {
  const { tmdbId } = await params;

  if (!tmdbId) {
    return new Response("Missing tmdbId", { status: 400 });
  }

  return subtitleResponse(
    await getMovieSubtitles(tmdbId),
    `tmdbId=${tmdbId}`
  );
}

export function OPTIONS() {
  return subtitleOptionsResponse();
}
