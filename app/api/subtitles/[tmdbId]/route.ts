import { getMovieSubtitles } from "@/lib/movie-subtitles";

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
    return new Response(
      "Missing tmdbId",
      {
        status: 400,
      }
    );
  }

  const subtitles =
    await getMovieSubtitles(tmdbId);

  if (!subtitles) {
    return new Response(
      "Subtitle file not found",
      {
        status: 404,
      }
    );
  }

  /*
   * ======================================================
   * OPTION 1
   *
   * subtitleFile is already base64.
   * ======================================================
   */

  if (subtitles.subtitleFile) {
    try {
      const buffer = Buffer.from(
        subtitles.subtitleFile,
        "base64"
      );

      if (!buffer.length) {
        throw new Error(
          "Decoded subtitle buffer is empty"
        );
      }

      return new Response(
        buffer,
        {
          status: 200,

          headers: {
            "Access-Control-Allow-Origin": "*",

            "Access-Control-Allow-Methods":
              "GET, OPTIONS",

            "Access-Control-Allow-Headers":
              "Content-Type",

            "Cache-Control":
              "public, max-age=300, s-maxage=3600",

            "Content-Type":
              "text/vtt; charset=utf-8",

            "Content-Disposition":
              'inline; filename="Bulgarian.vtt"',

            "X-Content-Type-Options":
              "nosniff",
          },
        }
      );
    } catch (error) {
      console.error(
        `failed to decode subtitleFile for tmdbId=${tmdbId}`,
        error
      );
    }
  }

  /*
   * ======================================================
   * OPTION 2
   *
   * subtitleTextUrl points to the actual VTT.
   * ======================================================
   */

  if (subtitles.subtitleTextUrl) {
    try {
      const sourceURL =
        new URL(
          subtitles.subtitleTextUrl
        );

      if (
        sourceURL.protocol !==
        "https:"
      ) {
        throw new Error(
          "subtitle URL must use HTTPS"
        );
      }

      const response =
        await fetch(
          sourceURL,
          {
            cache: "no-store",
            signal:
              AbortSignal.timeout(
                10_000
              ),
          }
        );

      if (!response.ok) {
        throw new Error(
          `subtitle source returned ${response.status}`
        );
      }

      const body =
        await response.arrayBuffer();

      if (!body.byteLength) {
        throw new Error(
          "subtitle response is empty"
        );
      }

      return new Response(
        body,
        {
          status: 200,

          headers: {
            "Access-Control-Allow-Origin":
              "*",

            "Access-Control-Allow-Methods":
              "GET, OPTIONS",

            "Access-Control-Allow-Headers":
              "Content-Type",

            "Cache-Control":
              "public, max-age=300, s-maxage=3600",

            "Content-Type":
              "text/vtt; charset=utf-8",

            "Content-Disposition":
              'inline; filename="Bulgarian.vtt"',

            "X-Content-Type-Options":
              "nosniff",
          },
        }
      );
    } catch (error) {
      console.error(
        `subtitle proxy request failed for tmdbId=${tmdbId}`,
        error
      );

      return new Response(
        "Subtitle file is unavailable",
        {
          status: 502,
        }
      );
    }
  }

  return new Response(
    "Subtitle file not found",
    {
      status: 404,
    }
  );
}

/*
 * Handle browser CORS preflight.
 */

export async function OPTIONS() {
  return new Response(
    null,
    {
      status: 204,

      headers: {
        "Access-Control-Allow-Origin":
          "*",

        "Access-Control-Allow-Methods":
          "GET, OPTIONS",

        "Access-Control-Allow-Headers":
          "Content-Type",

        "Access-Control-Max-Age":
          "86400",
      },
    }
  );
}
