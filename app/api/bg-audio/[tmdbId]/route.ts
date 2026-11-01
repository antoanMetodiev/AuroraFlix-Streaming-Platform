import { getMovieBgAudio } from "@/lib/movie-bg-audio";

export const runtime = "nodejs";

/**
 * The movie's Bulgarian-audio stream for the БГ аудио player (see
 * lib/movie-bg-audio.ts), or 404. Browsers may keep the answer for half an
 * hour — the stream link inside stays valid far longer.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ tmdbId: string }> }) {
  const { tmdbId } = await params;

  if (!tmdbId) {
    return new Response("Missing tmdbId", { status: 400 });
  }

  const stream = await getMovieBgAudio(tmdbId);

  if (!stream) {
    return Response.json({ error: "no Bulgarian audio" }, { status: 404, headers: { "Cache-Control": "public, max-age=600" } });
  }

  return Response.json(stream, { headers: { "Cache-Control": "public, max-age=1800" } });
}
