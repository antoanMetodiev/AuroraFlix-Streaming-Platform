"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/lib/i18n/locale-context";

export type TitleKind = "movie" | "series";

export type LocalizedTitle = {
  title: string;
  originalTitle?: string | null;
  posterImgURL?: string | null;
};

type TitleRow = LocalizedTitle & { tmdbId: string };

/** "MOVIE" / "TV-SHOW" / "SERIES" as the saved lists store it. */
export function titleKind(type?: string | null): TitleKind {
  return type === "MOVIE" ? "movie" : "series";
}

// Shared across every list on the page and kept for the session — a title's
// name doesn't change while someone browses. Keyed by language too.
const cache = new Map<string, LocalizedTitle | null>();
const cacheKey = (locale: string, kind: TitleKind, tmdbId: string) => `${locale}:${kind}:${tmdbId}`;

async function fetchTitles(kind: TitleKind, ids: string[]): Promise<TitleRow[]> {
  const path = kind === "movie" ? "get-movie-titles" : "get-series-titles";
  // /api/backend adds the visitor's ?lang (see app/api/backend).
  const response = await fetch(`/api/backend/${path}?ids=${encodeURIComponent(ids.join(","))}`);
  if (!response.ok) return [];
  return (await response.json()) as TitleRow[];
}

/**
 * The watchlist, playlists, likes and last-viewed store a copy of each
 * title and poster from when it was saved — in whatever language the site
 * was in then. This looks up the catalog's current ones, in the language the
 * visitor uses now, so a list never mixes languages. Until they arrive (or
 * for a title no longer in the catalog) the saved copy is shown.
 */
export function useLocalizedTitles(items: { kind: TitleKind; tmdbId?: string | null }[]) {
  const { locale } = useLocale();
  const [, setVersion] = useState(0);

  // Only the ids matter for when to (re)fetch — keyed by a plain string so a
  // new array with the same entries doesn't refetch.
  const signature = items.map((item) => `${item.kind}:${item.tmdbId ?? ""}`).join("|");
  const wanted = useMemo(() => {
    const byKind: Record<TitleKind, string[]> = { movie: [], series: [] };
    for (const entry of signature ? signature.split("|") : []) {
      const [kind, tmdbId] = entry.split(":") as [TitleKind, string];
      if (tmdbId && !byKind[kind].includes(tmdbId)) byKind[kind].push(tmdbId);
    }
    return byKind;
  }, [signature]);

  useEffect(() => {
    let cancelled = false;
    for (const kind of ["movie", "series"] as const) {
      const missing = wanted[kind].filter((id) => !cache.has(cacheKey(locale, kind, id)));
      if (missing.length === 0) continue;
      // Mark as in flight so other lists on the page don't ask again.
      for (const id of missing) cache.set(cacheKey(locale, kind, id), null);
      fetchTitles(kind, missing)
        .then((rows) => {
          for (const row of rows) cache.set(cacheKey(locale, kind, row.tmdbId), row);
          if (!cancelled) setVersion((version) => version + 1);
        })
        .catch(() => {
          for (const id of missing) cache.delete(cacheKey(locale, kind, id));
        });
    }
    return () => {
      cancelled = true;
    };
  }, [wanted, locale]);

  return (kind: TitleKind, tmdbId?: string | null): LocalizedTitle | null =>
    tmdbId ? (cache.get(cacheKey(locale, kind, tmdbId)) ?? null) : null;
}

type SavedItem = { type?: string | null; tmdbId?: string | null; title?: string | null; posterImgURL?: string | null };

/**
 * A saved list (watchlist / playlist / likes) with each entry's title and
 * poster swapped for the catalog's current ones in the visitor's language —
 * see useLocalizedTitles. Adds `originalTitle` (English) for building links.
 */
export function useLocalizedItems<T extends SavedItem>(items: T[] | null): (T & { originalTitle?: string | null })[] | null {
  const lookup = useLocalizedTitles((items ?? []).map((item) => ({ kind: titleKind(item.type), tmdbId: item.tmdbId })));
  if (!items) return null;
  return items.map((item): T & { originalTitle?: string | null } => {
    const current = lookup(titleKind(item.type), item.tmdbId);
    return current
      ? { ...item, title: current.title, posterImgURL: current.posterImgURL || item.posterImgURL, originalTitle: current.originalTitle ?? current.title }
      : item;
  });
}
