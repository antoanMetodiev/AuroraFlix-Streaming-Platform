const STORAGE_KEY = "AURORAFLIX_WATCHLIST";
const MAX_ITEMS = 20;
export const MAX_WATCHLIST_ITEMS = MAX_ITEMS;

export type WatchlistItem = {
  id: string;
  tmdbId?: string | null;
  title?: string;
  posterImgURL?: string | null;
  tmdbRating?: string;
  type?: "MOVIE" | "TV-SHOW";
  videoId?: string;
};

type WatchlistItemResponse = {
  recordId: string;
  tmdbId: string | null;
  title: string | null;
  posterImgURL: string | null;
  tmdbRating: string | null;
  type: string | null;
  videoId: string | null;
};

// --- Anonymous (signed-out) watchlist — browser localStorage. ---

function readLocalWatchlist(): WatchlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeIds(JSON.parse(raw) as WatchlistItem[]) : [];
  } catch {
    return [];
  }
}

/**
 * Signed-out equivalent of the server-side backfill (lumo-user-svc's
 * migrations/001_record_id_to_tmdb_id.sql): entries saved before ids became
 * TMDB-keyed (see lib/record-key.ts) hold a table uuid instead, which no
 * longer matches what the buttons look up. Rewrite those to the tmdbId they
 * already carry, dropping any duplicate the rewrite collapses (the same
 * title saved once from the hero and once from its details page). Entries
 * with no tmdbId are left alone — there is nothing to rewrite them to.
 *
 * Read-time only; whatever writes next persists the normalized list.
 */
function normalizeIds(items: WatchlistItem[]): WatchlistItem[] {
  const seen = new Set<string>();
  const normalized: WatchlistItem[] = [];
  for (const entry of items) {
    const id = entry.tmdbId ?? entry.id;
    if (seen.has(id)) continue;
    seen.add(id);
    normalized.push(entry.id === id ? entry : { ...entry, id });
  }
  return normalized;
}

// Newest-first, matching the server-backed list's ordering.
export function getLocalWatchlist(): WatchlistItem[] {
  return [...readLocalWatchlist()].reverse();
}

export function addToLocalWatchlist(item: WatchlistItem) {
  if (!item.id) return;
  const list = readLocalWatchlist();
  if (list.some((entry) => entry.id === item.id)) return;

  if (list.length >= MAX_ITEMS) list.shift();
  list.push(item);

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function removeFromLocalWatchlist(id: string) {
  const list = readLocalWatchlist().filter((entry) => entry.id !== id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

// --- Signed-in watchlist — synced to lumo-user-svc through our own API
// routes (app/api/watchlist), which attach the Clerk session token
// server-side so it's never handled directly in client code. ---

export async function getServerWatchlist(): Promise<WatchlistItem[]> {
  try {
    const response = await fetch("/api/watchlist", { cache: "no-store" });
    if (!response.ok) {
      console.error("getServerWatchlist failed:", response.status, await response.text());
      return [];
    }
    const items = (await response.json()) as WatchlistItemResponse[];
    return items.map((entry) => ({
      id: entry.recordId,
      tmdbId: entry.tmdbId,
      title: entry.title ?? undefined,
      posterImgURL: entry.posterImgURL,
      tmdbRating: entry.tmdbRating ?? undefined,
      type: entry.type as WatchlistItem["type"],
      videoId: entry.videoId ?? undefined,
    }));
  } catch {
    return [];
  }
}

export async function addToServerWatchlist(item: WatchlistItem): Promise<boolean> {
  try {
    const response = await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recordId: item.id,
        tmdbId: item.tmdbId,
        title: item.title,
        posterImgURL: item.posterImgURL,
        tmdbRating: item.tmdbRating,
        type: item.type,
        videoId: item.videoId,
      }),
    });
    if (!response.ok) console.error("addToServerWatchlist failed:", response.status, await response.text());
    return response.ok;
  } catch (error) {
    console.error("addToServerWatchlist threw:", error);
    return false;
  }
}

export async function removeFromServerWatchlist(id: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/watchlist/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) console.error("removeFromServerWatchlist failed:", response.status, await response.text());
    return response.ok;
  } catch (error) {
    console.error("removeFromServerWatchlist threw:", error);
    return false;
  }
}
