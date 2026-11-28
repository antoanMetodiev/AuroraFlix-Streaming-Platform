import { forbidden, isAdminRequest } from "@/lib/admin";
import { subtitleTitles } from "@/lib/admin-subtitles";
import { getMovieDetails, getSeriesDetails } from "@/lib/api";
import type { SubtitleKind } from "@/lib/subtitle-source";

const PAGE_SIZE = 30;
const KINDS: SubtitleKind[] = ["machine", "cam", "provider"];

// Admin only: the titles whose subtitles are of one kind (the "Субтитри"
// admin filter), as catalog records plus each one's source.
// ?type=movie|series&kind=machine|cam|provider&page=1
export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return forbidden();
  const url = new URL(request.url);
  const type = url.searchParams.get("type") === "series" ? "series" : "movie";
  const kind = url.searchParams.get("kind") as SubtitleKind;
  if (!KINDS.includes(kind)) return Response.json({ error: "bad kind" }, { status: 400 });
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);

  const titles = await subtitleTitles(type, kind, page, PAGE_SIZE);
  if (!titles) return Response.json({ error: "subtitles service unavailable" }, { status: 502 });

  const records = await Promise.all(
    titles.items.map((item) => (type === "movie" ? getMovieDetails(item.tmdbId) : getSeriesDetails(item.tmdbId)).catch(() => null))
  );
  const found = records.flatMap((record, i) => (record ? [{ record, item: titles.items[i] }] : []));
  return Response.json(
    {
      total: titles.total,
      totalPages: Math.max(1, Math.ceil(titles.total / PAGE_SIZE)),
      records: found.map(({ record }) => record),
      // Movies: id → raw source; series: id → episode counts by kind.
      sources: Object.fromEntries(
        found.map(({ item }) => [item.tmdbId, type === "movie" ? item.source ?? "" : { machine: item.machine ?? 0, cam: item.cam ?? 0, provider: item.provider ?? 0 }])
      ),
      // Titles the catalog doesn't have (subtitle rows for removed titles).
      missing: titles.items.length - found.length,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
