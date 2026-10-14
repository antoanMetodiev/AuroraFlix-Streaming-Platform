import { detectLocale } from "@/lib/i18n/detect-locale";

/**
 * The language the caller's country maps to (same rule as the website — see
 * detectLocale): the mobile app asks this once, on its very first launch, so
 * a Greek or Spanish phone opens in its language the way the site does.
 * Cloudflare puts the caller's country in CF-IPCountry; without it (local dev)
 * it falls back to Accept-Language.
 */
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "no-store",
};

export function GET(request: Request) {
  const country = request.headers.get("cf-ipcountry");
  const locale = detectLocale({
    savedLocale: undefined,
    userAgent: null,
    country,
    acceptLanguage: request.headers.get("accept-language"),
  });
  return Response.json({ country, locale }, { headers: CORS_HEADERS });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
