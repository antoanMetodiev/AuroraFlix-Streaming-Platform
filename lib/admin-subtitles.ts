import "server-only";
import type { SeriesSourceCounts, SubtitleKind } from "@/lib/subtitle-source";

// The subtitles services' read-only admin endpoints (cmd/server/admin.go in
// lumo-movies-subtitles-taker-svc / lumo-series-subtitles-taker-svc).
const MOVIES_TAKER = process.env.SUBTITLES_TAKER_URL ?? "https://lumo-movies-subtitles-taker-svc.onrender.com";
const SERIES_TAKER = process.env.SERIES_SUBTITLES_TAKER_URL ?? "https://lumo-series-subtitles-taker-svc.onrender.com";

export type RecordType = "movie" | "series";

function base(type: RecordType) {
  return type === "movie" ? MOVIES_TAKER : SERIES_TAKER;
}

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(60_000) });
    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
}

/** Movies: id → raw source. Series: id → episode counts by kind. */
export async function subtitleSources(type: "movie", ids: string[]): Promise<Record<string, string>>;
export async function subtitleSources(type: "series", ids: string[]): Promise<Record<string, SeriesSourceCounts>>;
export async function subtitleSources(type: RecordType, ids: string[]) {
  const query = encodeURIComponent(ids.slice(0, 200).join(","));
  if (type === "movie") {
    const rows = (await getJson<{ tmdbId: string; source: string }[]>(`${base(type)}/admin/subtitle-sources?ids=${query}`)) ?? [];
    return Object.fromEntries(rows.map((row) => [row.tmdbId, row.source]));
  }
  const rows = (await getJson<({ tmdbId: string } & SeriesSourceCounts)[]>(`${base(type)}/admin/subtitle-sources?ids=${query}`)) ?? [];
  return Object.fromEntries(rows.map(({ tmdbId, ...counts }) => [tmdbId, counts]));
}

export type TitlesPage = { total: number; items: { tmdbId: string; source?: string; machine?: number; cam?: number; provider?: number }[] };

export async function subtitleTitles(type: RecordType, kind: SubtitleKind, page: number, size: number): Promise<TitlesPage | null> {
  return getJson<TitlesPage>(`${base(type)}/admin/subtitle-titles?kind=${kind}&page=${page}&size=${size}`);
}

/** The raw source of one movie's / episode's subtitle, or null when there's none. */
export async function subtitleSourceOf(type: RecordType, tmdbId: string, season?: string, episode?: string): Promise<string | null> {
  const path =
    type === "movie"
      ? `/get-subtitles/${encodeURIComponent(tmdbId)}`
      : `/get-subtitles/${encodeURIComponent(tmdbId)}/${encodeURIComponent(season ?? "")}/${encodeURIComponent(episode ?? "")}`;
  const data = await getJson<{ subtitleTextUrl?: string | null }>(`${base(type)}${path}`);
  if (!data) return null;
  return data.subtitleTextUrl ?? "";
}
