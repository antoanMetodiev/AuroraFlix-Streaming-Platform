const SUBTITLES_TAKER_URL =
  process.env.SUBTITLES_TAKER_URL ??
  "https://lumo-movies-subtitles-taker-svc.onrender.com";

export const runtime = "nodejs";

/**
 * The movie's ZenoPlay VidHide embed + audio languages, for the Android app's
 * БГ аудио player. Not the stream itself: its signed links only play on the
 * network that resolved them, so the app resolves the embed on the viewer's
 * own connection (see public/bg-player.html). 404 when there's no dub.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ tmdbId: string }> }) {
  const { tmdbId } = await params;

  if (!tmdbId) {
    return new Response("Missing tmdbId", { status: 400 });
  }

  try {
    const response = await fetch(`${SUBTITLES_TAKER_URL}/get-bg-audio-source/${encodeURIComponent(tmdbId)}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });

    if (response.ok) {
      const data = (await response.json()) as {
        tmdbId?: string;
        embedUrl?: string;
        audioLanguages?: string[];
        filmi2kEmbedUrl?: string;
      };
      // embedUrl: ZenoPlay's VidHide (the app resolves it as HLS; "" when
      // there's none). filmi2kEmbedUrl: the second source, a plain embed —
      // the site's БГ аудио 2 player.
      if (data.tmdbId === tmdbId && (data.embedUrl || data.filmi2kEmbedUrl)) {
        return Response.json(
          {
            tmdbId,
            embedUrl: data.embedUrl ?? "",
            audioLanguages: data.audioLanguages ?? [],
            filmi2kEmbedUrl: data.filmi2kEmbedUrl ?? "",
          },
          { headers: { "Cache-Control": "public, max-age=3600" } }
        );
      }
    } else if (response.status !== 404) {
      console.error(`bg-audio-source service returned ${response.status} for tmdbId=${tmdbId}`);
    }
  } catch (error) {
    console.error(`bg-audio-source request failed for tmdbId=${tmdbId}`, error);
  }

  return Response.json({ error: "no Bulgarian audio" }, { status: 404, headers: { "Cache-Control": "public, max-age=600" } });
}
