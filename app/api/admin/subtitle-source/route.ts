import { forbidden, isAdminRequest } from "@/lib/admin";
import { subtitleSourceOf } from "@/lib/admin-subtitles";

// Admin only: where one movie's / episode's subtitle came from (the player's note).
// ?type=movie|series&tmdbId=…[&season=…&episode=…]
export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return forbidden();
  const url = new URL(request.url);
  const type = url.searchParams.get("type") === "series" ? "series" : "movie";
  const tmdbId = url.searchParams.get("tmdbId") ?? "";
  if (!tmdbId) return Response.json({ source: null });
  const source = await subtitleSourceOf(type, tmdbId, url.searchParams.get("season") ?? undefined, url.searchParams.get("episode") ?? undefined);
  return Response.json({ source }, { headers: { "Cache-Control": "no-store" } });
}
