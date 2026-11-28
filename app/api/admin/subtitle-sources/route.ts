import { forbidden, isAdminRequest } from "@/lib/admin";
import { subtitleSources } from "@/lib/admin-subtitles";

// Admin only: where the subtitles of the listed titles came from (card badges).
// ?type=movie|series&ids=1,2,3
export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return forbidden();
  const url = new URL(request.url);
  const type = url.searchParams.get("type") === "series" ? "series" : "movie";
  const ids = (url.searchParams.get("ids") ?? "").split(",").map((id) => id.trim()).filter(Boolean);
  const sources = type === "movie" ? await subtitleSources("movie", ids) : await subtitleSources("series", ids);
  return Response.json(sources, { headers: { "Cache-Control": "no-store" } });
}
