import "server-only";

import type { MovieSubtitles } from "@/lib/movie-subtitles";

/*
 * The players fetch our .vtt from their own origin (see the URL builders in
 * components/movies/details/player-section.tsx), hence the CORS headers.
 */
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const VTT_HEADERS = {
  ...CORS_HEADERS,
  "Cache-Control": "public, max-age=300, s-maxage=3600",
  "Content-Type": "text/vtt; charset=utf-8",
  "Content-Disposition": 'inline; filename="Bulgarian.vtt"',
  "X-Content-Type-Options": "nosniff",
};

/**
 * Turns a subtitles-taker record (movie or episode) into the .vtt response
 * the /api/subtitles routes serve. `label` only goes into error logs.
 */
export async function subtitleResponse(
  subtitles: MovieSubtitles | null,
  label: string
): Promise<Response> {
  if (!subtitles) {
    return new Response("Subtitle file not found", { status: 404 });
  }

  /*
   * OPTION 1 — subtitleFile is already base64.
   */
  if (subtitles.subtitleFile) {
    try {
      const buffer = Buffer.from(subtitles.subtitleFile, "base64");

      if (!buffer.length) {
        throw new Error("Decoded subtitle buffer is empty");
      }

      return new Response(buffer, { status: 200, headers: VTT_HEADERS });
    } catch (error) {
      console.error(`failed to decode subtitleFile for ${label}`, error);
    }
  }

  /*
   * OPTION 2 — subtitleTextUrl points to the actual VTT.
   */
  if (subtitles.subtitleTextUrl) {
    try {
      const sourceURL = new URL(subtitles.subtitleTextUrl);

      if (sourceURL.protocol !== "https:") {
        throw new Error("subtitle URL must use HTTPS");
      }

      const response = await fetch(sourceURL, {
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        throw new Error(`subtitle source returned ${response.status}`);
      }

      const body = await response.arrayBuffer();

      if (!body.byteLength) {
        throw new Error("subtitle response is empty");
      }

      return new Response(body, { status: 200, headers: VTT_HEADERS });
    } catch (error) {
      console.error(`subtitle proxy request failed for ${label}`, error);

      return new Response("Subtitle file is unavailable", { status: 502 });
    }
  }

  return new Response("Subtitle file not found", { status: 404 });
}

/**
 * Browser CORS preflight.
 */
export function subtitleOptionsResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: { ...CORS_HEADERS, "Access-Control-Max-Age": "86400" },
  });
}
