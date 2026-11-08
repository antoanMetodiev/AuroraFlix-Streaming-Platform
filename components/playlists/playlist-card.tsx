"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Film, Globe, ListVideo, Lock, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { FadeInImage } from "@/components/ui/fade-in-image";
import { Loader, Spinner } from "@/components/ui/loader";
import { LibraryPosterCard } from "@/components/library/library-poster-card";
import { tmdbImage, getMovieSlug } from "@/lib/tmdb";
import { searchMatchingMovies, searchMatchingSeries } from "@/lib/api-public";
import { addPlaylistItem, getPlaylistItems, removePlaylistItem, type Playlist, type PlaylistItem } from "@/lib/playlists";
import { getRecordKey } from "@/lib/record-key";
import { useTranslation } from "@/lib/i18n/locale-context";
import { useLocalizedItems } from "@/lib/use-localized-titles";
import type { Movie } from "@/types/movie";
import type { Series } from "@/types/series";

// Must match the backend handlers' default `limit` (movies-svc/series-svc
// search-*-matching-results) — used both as the page size we request and as
// the signal for whether another page might exist (a short page means no more).
const PAGE_SIZE = 10;

function hrefFor(item: PlaylistItem & { originalTitle?: string | null }) {
  return item.type === "TV-SHOW"
    ? `/series/${item.tmdbId}`
    : `/movies/${getMovieSlug({ title: item.title ?? "", originalTitle: item.originalTitle, tmdbId: item.tmdbId, movieId: item.videoId })}`;
}

function toPlaylistItem(record: Movie | Series, type: "movie" | "series"): PlaylistItem {
  const videoId = record.videoURL?.split("/")[5] ?? "";
  return {
    // TMDB id, the same identity watchlist/likes store — see lib/record-key.ts.
    id: getRecordKey(record, type),
    tmdbId: record.tmdbId,
    title: record.title,
    posterImgURL: record.posterImgURL,
    tmdbRating: record.tmdbRating,
    type: type === "movie" ? "MOVIE" : "TV-SHOW",
    videoId: type === "movie" ? videoId : "",
  };
}

// canManage gates both the edit/delete icons and the add-titles panel — a
// friend's public playlist (canManage=false) is browse-only.
export function PlaylistCard({
  playlist,
  canManage,
  onSave,
  onDelete,
  onNavigate,
  itemsPageSize,
}: {
  playlist: Playlist;
  canManage: boolean;
  onSave?: (id: string, name: string, isPublic: boolean) => Promise<boolean>;
  onDelete?: (id: string) => Promise<void>;
  // Fires when a poster inside this card is clicked through to its
  // movie/series page — lets an ancestor modal (e.g. UserProfileModal) close
  // itself instead of being left open on top of the page just navigated to.
  // No-op by default, since the standalone /playlists page has no modal to close.
  onNavigate?: () => void;
  // When set, only the first itemsPageSize items render initially, with a
  // "Load more" button revealing itemsPageSize more per click — used when
  // this card is nested inside something already dense (UserProfileModal's
  // "Shared playlists" section). Undefined (the /playlists page's own use)
  // just shows everything, since there's nothing else competing for space.
  itemsPageSize?: number;
}) {
  const { t } = useTranslation();
  // Starts expanded — per the user, browsing a playlist's titles shouldn't
  // require a click first. The collapse control still works, it's just not
  // the default state anymore.
  const [isExpanded, setIsExpanded] = useState(true);
  const [savedItems, setItems] = useState<PlaylistItem[] | null>(null);
  // Titles / posters in the language the visitor uses now (see useLocalizedItems).
  const items = useLocalizedItems(savedItems);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [visibleItemsCount, setVisibleItemsCount] = useState(itemsPageSize ?? Infinity);

  useEffect(() => {
    if (!isExpanded || items !== null) return;
    let cancelled = false;
    getPlaylistItems(playlist.id).then((result) => {
      if (!cancelled) setItems(result);
    });
    return () => {
      cancelled = true;
    };
  }, [isExpanded, items, playlist.id]);

  const handleAdded = (item: PlaylistItem) => {
    setItems((prev) => (prev ? [item, ...prev] : [item]));
  };

  const handleRemove = async (recordId: string) => {
    setItems((prev) => prev?.filter((it) => it.id !== recordId) ?? null);
    await removePlaylistItem(playlist.id, recordId);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete?.(playlist.id);
  };

  const coverPosters = (items ?? [])
    .map((item) => tmdbImage(item.posterImgURL, "w342"))
    .filter((poster): poster is string => Boolean(poster))
    .slice(0, 4);

  return (
    <div
      className={`group/card relative overflow-hidden rounded-[2rem] border bg-white/[0.04] backdrop-blur-md transition-all duration-500 ${
        isExpanded ? "border-white/15 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.8)]" : "border-white/10 hover:border-white/20"
      }`}
    >
      {/* The newest title's poster, blurred behind the header. */}
      {coverPosters[0] && (
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-48 overflow-hidden">
          <FadeInImage src={coverPosters[0]} alt="" sizes="600px" className="scale-125 object-cover opacity-30 blur-2xl" />
          <span className="absolute inset-0 bg-gradient-to-b from-transparent via-black/30 to-[#0b0b0c]/90" />
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/[0.06] to-transparent" />

      {isEditing ? (
        <EditForm
          playlist={playlist}
          onCancel={() => setIsEditing(false)}
          onSave={async (name, isPublic) => {
            const ok = (await onSave?.(playlist.id, name, isPublic)) ?? false;
            if (ok) setIsEditing(false);
            return ok;
          }}
        />
      ) : isConfirmingDelete ? (
        <div className="relative flex items-center gap-3 px-5 py-4 sm:px-6 sm:py-5">
          <p className="min-w-0 flex-1 text-sm font-medium text-foreground/80">{t("playlists.deleteConfirm")}</p>
          <IconButton icon={X} label={t("playlists.cancel")} onClick={() => setIsConfirmingDelete(false)} />
          <IconButton icon={Check} label={t("playlists.delete")} variant="primary" onClick={handleDelete} disabled={isDeleting} />
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => setIsExpanded((prev) => !prev)}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            setIsExpanded((prev) => !prev);
          }}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? t("playlists.collapse") : t("playlists.expand")}
          className="group relative flex w-full cursor-pointer items-center gap-4 px-4 py-4 text-left transition-colors duration-200 hover:bg-white/[0.03] sm:gap-5 sm:px-6 sm:py-5"
        >
          <CoverMosaic posters={coverPosters} />

          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{playlist.name}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold ${
                  playlist.isPublic ? "bg-white text-neutral-900" : "border border-white/15 bg-white/[0.06] text-foreground/75"
                }`}
              >
                {playlist.isPublic ? <Globe size={11} /> : <Lock size={11} />}
                {playlist.isPublic ? t("playlists.visibilityPublic") : t("playlists.visibilityPrivate")}
              </span>
              <span className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[0.6875rem] font-semibold text-foreground/75">
                <Film size={11} />
                {t("playlists.itemCount", { count: items?.length ?? playlist.itemCount })}
              </span>
            </div>
          </div>

          {canManage && (
            <div className="flex shrink-0 items-center gap-1.5" onClick={(event) => event.stopPropagation()}>
              <IconButton icon={Pencil} label={t("playlists.rename")} onClick={() => setIsEditing(true)} />
              <IconButton icon={Trash2} label={t("playlists.delete")} onClick={() => setIsConfirmingDelete(true)} />
            </div>
          )}

          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-foreground/50 transition-all duration-300 group-hover:border-white/25 group-hover:text-foreground">
            <ChevronDown size={17} className={`transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
          </span>
        </div>
      )}

      {isExpanded && !isEditing && !isConfirmingDelete && (
        <div className="relative border-t border-white/10 px-4 pt-5 pb-6 sm:px-6">
          {canManage && (
            <AddItemsPanel
              playlistId={playlist.id}
              existingIds={new Set((items ?? []).map((it) => it.id))}
              isOpen={isAdding}
              onToggle={() => setIsAdding((prev) => !prev)}
              onAdded={handleAdded}
            />
          )}

          {items === null ? (
            <Loader className="min-h-[8rem] py-6" />
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-2.5 py-10 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-foreground/5 text-foreground/30">
                <Film size={18} />
              </span>
              <p className="text-sm text-foreground/50">{t("playlists.noItems")}</p>
            </div>
          ) : (
            <>
              <div className={`grid grid-cols-2 gap-3 min-[460px]:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 ${canManage ? "mt-5" : ""}`}>
                {items.slice(0, visibleItemsCount).map((item, index) => (
                  <LibraryPosterCard
                    key={item.id}
                    href={hrefFor(item)}
                    title={item.title ?? ""}
                    poster={tmdbImage(item.posterImgURL, "w342")}
                    rating={item.tmdbRating}
                    isSeries={item.type === "TV-SHOW"}
                    onRemove={canManage ? () => handleRemove(item.id) : undefined}
                    removeLabel={t("playlists.removeItemAria")}
                    onNavigate={onNavigate}
                    index={index}
                    sizes="(min-width: 1280px) 180px, (min-width: 768px) 22vw, 45vw"
                    compact
                  />
                ))}
              </div>
              {itemsPageSize && items.length > visibleItemsCount && (
                <button
                  type="button"
                  onClick={() => setVisibleItemsCount((prev) => prev + itemsPageSize)}
                  className="mt-3 w-full rounded-xl py-2 text-xs font-semibold text-foreground/60 transition-colors duration-150 hover:bg-foreground/5 hover:text-foreground"
                >
                  {t("playlists.loadMore")}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function IconButton({
  icon: Icon,
  label,
  onClick,
  variant = "secondary",
  disabled = false,
}: {
  icon: typeof Search;
  label: string;
  onClick?: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-200 hover:scale-105 disabled:pointer-events-none disabled:opacity-40 ${
        variant === "primary" ? "bg-white text-neutral-900" : "border border-foreground/15 text-foreground/60 hover:bg-foreground/10 hover:text-foreground"
      }`}
    >
      <Icon size={15} />
    </button>
  );
}

// Shared name+visibility form — used both for the create panel
// (playlists-view.tsx) and for editing an existing playlist inline here.
export function VisibilityToggle({ value, onChange }: { value: boolean; onChange: (isPublic: boolean) => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex gap-1 rounded-full border border-foreground/10 bg-foreground/5 p-1">
      {[
        { isPublic: false, icon: Lock, labelKey: "playlists.visibilityPrivate" as const },
        { isPublic: true, icon: Globe, labelKey: "playlists.visibilityPublic" as const },
      ].map(({ isPublic, icon: Icon, labelKey }) => (
        <button
          key={String(isPublic)}
          type="button"
          onClick={() => onChange(isPublic)}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition-colors duration-200 ${
            value === isPublic ? "bg-white text-neutral-900" : "text-foreground/60 hover:text-foreground"
          }`}
        >
          <Icon size={13} />
          {t(labelKey)}
        </button>
      ))}
    </div>
  );
}

function EditForm({
  playlist,
  onSave,
  onCancel,
}: {
  playlist: Playlist;
  onSave: (name: string, isPublic: boolean) => Promise<boolean>;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(playlist.name);
  const [isPublic, setIsPublic] = useState(playlist.isPublic);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    await onSave(name.trim(), isPublic);
    setIsSaving(false);
  };

  return (
    <div className="relative flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:px-6 sm:py-5">
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder={t("playlists.namePlaceholder")}
        autoComplete="off"
        autoFocus
        className="min-w-0 flex-1 rounded-full border border-foreground/15 bg-foreground/[0.06] px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/35 outline-none transition-all duration-300 focus:border-transparent focus:bg-foreground/[0.1] focus:shadow-[0_0_0_1.5px_#ffffff]"
      />
      <div className="flex shrink-0 items-center gap-2">
        <VisibilityToggle value={isPublic} onChange={setIsPublic} />
        <IconButton icon={X} label={t("playlists.cancel")} onClick={onCancel} />
        <IconButton icon={Check} label={t("playlists.save")} variant="primary" onClick={handleSave} disabled={isSaving || !name.trim()} />
      </div>
    </div>
  );
}

/** The playlist's cover: its first four posters in a 2×2 tile (fewer: the first one fills it, none: an icon). */
function CoverMosaic({ posters }: { posters: string[] }) {
  return (
    <span className="relative block h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-white/20 to-white/[0.04] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)] ring-1 ring-white/15 sm:h-24 sm:w-24">
      {posters.length === 0 ? (
        <span className="flex h-full w-full items-center justify-center text-white/60">
          <ListVideo size={26} />
        </span>
      ) : posters.length < 4 ? (
        <FadeInImage src={posters[0]} alt="" sizes="96px" className="object-cover" />
      ) : (
        <span className="grid h-full w-full grid-cols-2 grid-rows-2 gap-px bg-black">
          {posters.map((poster) => (
            <span key={poster} className="relative overflow-hidden">
              <FadeInImage src={poster} alt="" sizes="48px" className="object-cover" />
            </span>
          ))}
        </span>
      )}
    </span>
  );
}

function AddItemsPanel({
  playlistId,
  existingIds,
  isOpen,
  onToggle,
  onAdded,
}: {
  playlistId: string;
  existingIds: Set<string>;
  isOpen: boolean;
  onToggle: () => void;
  onAdded: (item: PlaylistItem) => void;
}) {
  const { t } = useTranslation();
  const [type, setType] = useState<"movie" | "series">("movie");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<(Movie | Series)[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  // true once a page comes back shorter than PAGE_SIZE — nothing more to load.
  const [hasMore, setHasMore] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!limitReached) return;
    const timeout = window.setTimeout(() => setLimitReached(false), 4000);
    return () => window.clearTimeout(timeout);
  }, [limitReached]);

  useEffect(() => {
    if (!isOpen || !query.trim()) return;

    const timeout = window.setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const found =
          type === "movie"
            ? await searchMatchingMovies(query, controller.signal, PAGE_SIZE, 0)
            : await searchMatchingSeries(query, controller.signal, PAGE_SIZE, 0);
        setResults(found);
        setHasMore(found.length === PAGE_SIZE);
      } catch {
        // aborted or network error — ignore
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [isOpen, query, type]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (value.trim()) {
      setIsSearching(true);
    } else {
      setResults([]);
      setHasMore(false);
      setIsSearching(false);
    }
  };

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    try {
      const more =
        type === "movie" ? await searchMatchingMovies(query, undefined, PAGE_SIZE, results.length) : await searchMatchingSeries(query, undefined, PAGE_SIZE, results.length);
      setResults((prev) => [...prev, ...more]);
      setHasMore(more.length === PAGE_SIZE);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleAdd = async (record: Movie | Series) => {
    setAddingId(getRecordKey(record, type));
    const item = toPlaylistItem(record, type);
    const result = await addPlaylistItem(playlistId, item);
    if (result === "ok") onAdded(item);
    if (result === "limit") setLimitReached(true);
    setAddingId(null);
  };

  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={onToggle}
        className={`group flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed py-3.5 text-sm font-semibold transition-all duration-300 ${
          isOpen ? "border-white/30 bg-white/[0.06] text-foreground" : "border-white/15 text-foreground/60 hover:border-white/35 hover:bg-white/[0.04] hover:text-foreground"
        }`}
      >
        {isOpen ? <X size={15} /> : <Plus size={15} className="transition-transform duration-200 group-hover:rotate-90" />}
        {t("playlists.addTitles")}
      </button>

      {limitReached && <p className="mt-2 px-1 text-xs font-medium text-foreground/60">{t("playlists.itemLimitReached")}</p>}

      {isOpen && (
        <div className="animate-card-in mt-3 rounded-3xl border border-white/10 bg-black/30 p-3 backdrop-blur-md sm:p-4" style={{ animationDuration: "0.3s" }}>
          <div className="mb-3 flex gap-1 rounded-full border border-foreground/10 bg-foreground/5 p-1">
            {(["movie", "series"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setType(value);
                  setResults([]);
                  setHasMore(false);
                }}
                className={`flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors duration-200 ${
                  type === value ? "bg-white text-neutral-900" : "text-foreground/60 hover:text-foreground"
                }`}
              >
                {t(value === "movie" ? "search.movies" : "search.series")}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search size={15} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-foreground/40" />
            <input
              value={query}
              onChange={(event) => handleQueryChange(event.target.value)}
              placeholder={type === "movie" ? t("search.placeholderMovies") : t("search.placeholderSeries")}
              autoComplete="off"
              autoFocus
              className="w-full rounded-full border border-foreground/15 bg-foreground/[0.06] py-2.5 pr-4 pl-11 text-sm text-foreground placeholder:text-foreground/35 outline-none transition-all duration-300 focus:border-transparent focus:bg-foreground/[0.1] focus:shadow-[0_0_0_1.5px_#ffffff]"
            />
            {isSearching && <Spinner size={13} className="absolute top-1/2 right-3.5 -translate-y-1/2" />}
          </div>

          {results.length > 0 && (
            <ul className="mt-2 flex max-h-64 flex-col gap-1 overflow-y-auto">
              {results.map((record, index) => {
                const recordKey = getRecordKey(record, type);
                const alreadyIn = existingIds.has(recordKey);
                const poster = tmdbImage(record.posterImgURL, "w342");
                return (
                  <li
                    key={record.id}
                    className="animate-card-in flex items-center gap-3 rounded-xl px-2 py-2 transition-colors duration-150 hover:bg-foreground/5"
                    style={{ animationDelay: `${Math.min(index, 8) * 25}ms`, animationDuration: "0.3s" }}
                  >
                    {poster && (
                      <span className="relative h-[60px] w-[42px] shrink-0 overflow-hidden rounded-lg">
                        <FadeInImage src={poster} alt="" sizes="42px" className="object-cover" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground/85">{record.title}</span>
                    {alreadyIn ? (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-foreground/40">
                        <Check size={15} />
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAdd(record)}
                        disabled={addingId === recordKey}
                        aria-label={t("playlists.addTitles")}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-neutral-900 transition-transform duration-200 hover:scale-105 disabled:opacity-50"
                      >
                        {addingId === recordKey ? <Spinner size={13} /> : <Plus size={15} />}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {hasMore && (
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold text-foreground/60 transition-colors duration-150 hover:bg-foreground/5 hover:text-foreground disabled:opacity-50"
            >
              {isLoadingMore ? <Spinner size={13} /> : t("playlists.loadMore")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
