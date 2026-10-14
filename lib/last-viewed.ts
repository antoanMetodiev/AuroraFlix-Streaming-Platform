import type { LastViewed } from "@/types/last-viewed";

const STORAGE_KEY = "AURORAFLIX-LAST-VIEWED";
const MAX_ITEMS = 20;

type LastViewedResponse = {
  type: "MOVIE" | "SERIES";
  tmdbId: string | null;
  seriesId: string | null;
  posterURL: string | null;
  title: string;
  tmdbRating: string | null;
  videoURL: string | null;
  releaseDate: string | null;
};

// --- Anonymous (signed-out) — browser localStorage. ---

function readLocalLastViewed(): LastViewed[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LastViewed[]) : [];
  } catch {
    return [];
  }
}

/**
 * One movie / series across languages: titles come back translated
 * (Inception / Генезис), so they're matched by TMDB id (or series id) and
 * only fall back to the title for entries saved without one.
 */
function recordKey(entry: LastViewed) {
  if (entry.tmdbId) return `${entry.type}:tmdb:${entry.tmdbId}`;
  if (entry.seriesId) return `${entry.type}:series:${entry.seriesId}`;
  return `${entry.type}:title:${entry.title}`;
}

// Newest-first, matching the server-backed list's ordering — one entry per
// record (older, per-language duplicates collapse to the newest).
export function getLocalLastViewed(): LastViewed[] {
  const seen = new Set<string>();
  return [...readLocalLastViewed()].reverse().filter((entry) => {
    const key = recordKey(entry);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function addLocalLastViewed(entry: LastViewed) {
  if (typeof window === "undefined") return;

  // Re-viewing something already on the list bumps it to the top instead of duplicating it.
  const key = recordKey(entry);
  const withoutDuplicate = readLocalLastViewed().filter((item) => recordKey(item) !== key && item.title !== entry.title);
  withoutDuplicate.push(entry);

  const trimmed = withoutDuplicate.slice(-MAX_ITEMS);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

// --- Signed-in — synced to lumo-user-svc through app/api/last-viewed,
// which attaches the Clerk session token server-side. ---

export async function getServerLastViewed(): Promise<LastViewed[]> {
  try {
    const response = await fetch("/api/last-viewed", { cache: "no-store" });
    if (!response.ok) return [];
    const items = (await response.json()) as LastViewedResponse[];
    return items.map((entry) => ({
      type: entry.type,
      tmdbId: entry.tmdbId,
      seriesId: entry.seriesId ?? undefined,
      posterURL: entry.posterURL,
      title: entry.title,
      tmdbRating: entry.tmdbRating ?? "",
      videoURL: entry.videoURL,
      releaseDate: entry.releaseDate ?? "",
    }));
  } catch {
    return [];
  }
}

export async function addServerLastViewed(entry: LastViewed): Promise<boolean> {
  try {
    const response = await fetch("/api/last-viewed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
    return response.ok;
  } catch {
    return false;
  }
}
