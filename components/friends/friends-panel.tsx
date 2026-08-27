"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Clock, Film, Inbox, Search, Tv, UserMinus, UserPlus, Users, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Loader, Spinner } from "@/components/ui/loader";
import { FadeInImage } from "@/components/ui/fade-in-image";
import { UserProfileModal } from "@/components/friends/user-profile-modal";
import { useFriends } from "@/lib/use-friends";
import { searchUsers, type FriendRequestItem, type FriendSearchResult } from "@/lib/friends";
import type { WatchingTarget } from "@/lib/watching";
import { getMoviePreview, getSeriesPreview } from "@/lib/api-public";
import { tmdbImage, getMovieSlug } from "@/lib/tmdb";
import { useTranslation } from "@/lib/i18n/locale-context";
import type { Movie } from "@/types/movie";
import type { Series } from "@/types/series";

type Tab = "requests" | "friends" | "search";

type ProfileTarget = { clerkId: string; displayName: string | null; profileImageURL: string | null };

// The actual friends UI — three separate tabs (received/sent requests,
// friends list, search) instead of everything stacked in one scroll. No
// page/modal chrome of its own, so both /friends (full page) and
// FriendsModal (compact popup) can render the same logic.
export function FriendsPanel({ onNavigate }: { onNavigate?: () => void } = {}) {
  const { t } = useTranslation();
  const { friends, incoming, outgoing, watching, isLoading, accept, cancelOrDecline, send, remove } = useFriends();
  const [tab, setTab] = useState<Tab>("search");
  const [profile, setProfile] = useState<ProfileTarget | null>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FriendSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Fetches on every query change, blank included — a blank query is what
  // shows recently-joined users by default (see lib/friends.ts's
  // searchUsers doc comment), not an empty state. The 250ms debounce only
  // makes sense once there's something to debounce (actual keystrokes) —
  // applying it to the initial blank-query load too just adds a flat 250ms
  // of nothing before the tab shows anything.
  useEffect(() => {
    setIsSearching(true);

    const run = async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const found = await searchUsers(query, controller.signal);
        setResults(found);
      } catch {
        // aborted or network error — ignore
      } finally {
        setIsSearching(false);
      }
    };

    if (query === "") {
      run();
      return;
    }

    const timeout = window.setTimeout(run, 250);
    return () => window.clearTimeout(timeout);
  }, [query]);

  const handleSend = async (clerkId: string) => {
    setBusyId(clerkId);
    await send(clerkId);
    setResults((prev) => prev.map((r) => (r.clerkId === clerkId ? { ...r, relationship: "PENDING_SENT" } : r)));
    setBusyId(null);
  };

  const handleRemoveFromSearch = async (clerkId: string) => {
    setBusyId(clerkId);
    await remove(clerkId);
    setResults((prev) => prev.map((r) => (r.clerkId === clerkId ? { ...r, relationship: "NONE" } : r)));
    setBusyId(null);
  };

  const tabs: { key: Tab; label: string; icon: typeof Search; badge: number }[] = [
    { key: "search", label: t("friends.tabSearch"), icon: Search, badge: 0 },
    { key: "requests", label: t("friends.tabRequests"), icon: Inbox, badge: incoming.length },
    { key: "friends", label: t("friends.tabFriends"), icon: Users, badge: 0 },
  ];

  return (
    <div className="flex flex-col">
      <div className="mb-5 flex gap-1 rounded-2xl border border-foreground/10 bg-foreground/5 p-1.5">
        {tabs.map(({ key, label, icon: Icon, badge }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
              tab === key ? "bg-white text-neutral-900 shadow-[0_4px_16px_-4px_rgba(255,255,255,0.4)]" : "text-foreground/55 hover:bg-foreground/10 hover:text-foreground"
            }`}
          >
            <Icon size={15} />
            <span className="hidden sm:inline">{label}</span>
            {badge > 0 && (
              <span
                className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                  tab === key ? "bg-neutral-900 text-white" : "bg-white text-neutral-900"
                }`}
              >
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "search" && (
        <>
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-foreground/40" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("friends.searchPlaceholder")}
              autoComplete="off"
              className="w-full rounded-full border border-foreground/15 bg-foreground/[0.06] py-3 pr-4 pl-11 text-sm text-foreground placeholder:text-foreground/35 outline-none transition-all duration-300 focus:border-transparent focus:bg-foreground/[0.1] focus:shadow-[0_0_0_1.5px_#ffffff]"
            />
            {isSearching && <Spinner size={13} className="absolute top-1/2 right-3.5 -translate-y-1/2" />}
          </div>

          <ul className="mt-2 flex max-h-80 flex-col gap-1 overflow-y-auto">
            {query.trim() && results.length === 0 && !isSearching && (
              <p className="px-1 py-3 text-center text-sm text-foreground/50">{t("friends.searchEmpty")}</p>
            )}
            {results.map((result) => (
              <SearchResultRow
                key={result.clerkId}
                result={result}
                busy={busyId === result.clerkId}
                onAdd={() => handleSend(result.clerkId)}
                onRemove={() => handleRemoveFromSearch(result.clerkId)}
                onOpenProfile={setProfile}
              />
            ))}
          </ul>
        </>
      )}

      {tab === "requests" &&
        (isLoading ? (
          <Loader className="min-h-[10rem] py-8" />
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <RequestsList
              title={t("friends.incomingTitle")}
              items={incoming}
              emptyLabel={t("friends.noPending")}
              onOpenProfile={setProfile}
              renderActions={(req) => (
                <>
                  <ActionIcon icon={Check} label={t("friends.accept")} variant="primary" onClick={() => accept(req.id)} />
                  <ActionIcon icon={X} label={t("friends.decline")} onClick={() => cancelOrDecline(req.id)} />
                </>
              )}
            />

            {outgoing.length > 0 && (
              <RequestsList
                title={t("friends.outgoingTitle")}
                items={outgoing}
                onOpenProfile={setProfile}
                renderActions={(req) => <ActionIcon icon={X} label={t("friends.cancel")} onClick={() => cancelOrDecline(req.id)} />}
              />
            )}
          </div>
        ))}

      {tab === "friends" &&
        (isLoading ? (
          <Loader className="min-h-[10rem] py-8" />
        ) : friends.length === 0 ? (
          <p className="px-1 py-6 text-center text-sm text-foreground/50">{t("friends.friendsEmpty")}</p>
        ) : (
          <ul className="flex max-h-96 flex-col gap-1 overflow-y-auto">
            {friends.map((friend) => (
              <li key={friend.clerkId} className="flex flex-col rounded-2xl px-2.5 py-2.5 transition-colors duration-150 hover:bg-foreground/5">
                <div className="flex items-center gap-3">
                  <IdentityButton clerkId={friend.clerkId} name={friend.displayName} imageURL={friend.profileImageURL} onOpen={setProfile} />
                  <ActionIcon icon={UserMinus} label={t("friends.remove")} onClick={() => remove(friend.clerkId)} />
                </div>
                {watching[friend.clerkId] && <FriendWatchingCard watching={watching[friend.clerkId]} />}
              </li>
            ))}
          </ul>
        ))}

      {profile && (
        <UserProfileModal
          clerkId={profile.clerkId}
          displayName={profile.displayName}
          profileImageURL={profile.profileImageURL}
          onClose={() => setProfile(null)}
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
}

function IdentityButton({
  clerkId,
  name,
  imageURL,
  onOpen,
}: {
  clerkId: string;
  name: string | null;
  imageURL: string | null;
  onOpen: (target: ProfileTarget) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen({ clerkId, displayName: name, profileImageURL: imageURL })}
      className="flex min-w-0 flex-1 items-center gap-3 text-left"
    >
      <Avatar src={imageURL} name={name} size={36} />
      <p className="min-w-0 flex-1 truncate text-sm text-foreground/85">{name || "?"}</p>
    </button>
  );
}

function watchingHref(watching: WatchingTarget) {
  return watching.type === "movie"
    ? `/movies/${getMovieSlug({ title: watching.title, tmdbId: watching.tmdbId })}`
    : `/series/${watching.tmdbId}`;
}

// The persistent, always-visible counterpart to WatchingToastManager's
// transient push — this renders for as long as `watching` stays truthy
// (backed by useFriends' merged snapshot+live-push state), so it's still
// here to check even long after the one-time toast for "started watching"
// has already fired and disappeared.
function FriendWatchingCard({ watching }: { watching: WatchingTarget }) {
  const { t } = useTranslation();
  // Keyed so a stale in-flight fetch for a previous title (switched episode,
  // or the friend started something else) can't clobber the current one —
  // `loaded` is derived from whether the resolved key still matches, instead
  // of a separate flag reset synchronously at the top of the effect.
  const key = `${watching.type}:${watching.tmdbId}`;
  const [resolved, setResolved] = useState<{ key: string; preview: Movie | Series | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchPreview = watching.type === "movie" ? getMoviePreview(watching.tmdbId) : getSeriesPreview(watching.tmdbId);
    fetchPreview.then((result) => {
      if (!cancelled) setResolved({ key, preview: result });
    });
    return () => {
      cancelled = true;
    };
  }, [key, watching.type, watching.tmdbId]);

  const loaded = resolved?.key === key;
  const preview = loaded ? resolved.preview : null;
  const TypeIcon = watching.type === "movie" ? Film : Tv;
  const poster = tmdbImage(preview?.posterImgURL, "w342");
  const genres = (preview?.genres ?? "")
    .split(",")
    .map((genre) => genre.trim())
    .filter(Boolean)
    .slice(0, 2);

  return (
    <Link
      href={watchingHref(watching)}
      className="mt-2 flex items-center gap-2.5 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-2 transition-colors duration-150 hover:bg-emerald-400/[0.1]"
    >
      <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md bg-foreground/10">
        {poster ? (
          <FadeInImage src={poster} alt="" sizes="40px" className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-foreground/30">
            <TypeIcon size={14} />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 text-[10px] font-semibold tracking-wide text-emerald-400 uppercase">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
          {t("friends.watching")}
        </p>
        <p className="truncate text-xs font-semibold text-foreground/90">{watching.title}</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {!loaded ? (
            <span className="h-3.5 w-12 animate-pulse rounded-full bg-foreground/10" />
          ) : (
            genres.map((genre) => (
              <span key={genre} className="rounded-full bg-foreground/10 px-1.5 py-0.5 text-[9px] font-medium text-foreground/60">
                {genre}
              </span>
            ))
          )}
        </div>
      </div>
    </Link>
  );
}

function RequestsList({
  title,
  items,
  emptyLabel,
  onOpenProfile,
  renderActions,
}: {
  title: string;
  items: FriendRequestItem[];
  emptyLabel?: string;
  onOpenProfile: (target: ProfileTarget) => void;
  renderActions: (item: FriendRequestItem) => React.ReactNode;
}) {
  if (items.length === 0 && !emptyLabel) return null;

  return (
    <div className="mt-4 first:mt-0">
      <h3 className="mb-1.5 px-1 text-xs font-semibold tracking-wide text-foreground/50 uppercase">{title}</h3>
      {items.length === 0 ? (
        <p className="px-1 py-2 text-sm text-foreground/50">{emptyLabel}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 rounded-2xl px-2.5 py-2.5 transition-colors duration-150 hover:bg-foreground/5">
              <IdentityButton clerkId={item.clerkId} name={item.displayName} imageURL={item.profileImageURL} onOpen={onOpenProfile} />
              {renderActions(item)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// See earlier note: PENDING_SENT/PENDING_RECEIVED found via search have no
// request id to act on here (the search query deliberately stays a single
// JOIN, no extra lookups) — those two states just show a passive label;
// manage them from the Requests tab instead. FRIENDS can still act inline
// since removeFriend only needs the other person's clerkId.
function SearchResultRow({
  result,
  busy,
  onAdd,
  onRemove,
  onOpenProfile,
}: {
  result: FriendSearchResult;
  busy: boolean;
  onAdd: () => void;
  onRemove: () => void;
  onOpenProfile: (target: ProfileTarget) => void;
}) {
  const { t } = useTranslation();

  return (
    <li className="flex items-center gap-3 rounded-2xl px-2.5 py-2.5 transition-colors duration-150 hover:bg-foreground/5">
      <IdentityButton clerkId={result.clerkId} name={result.displayName} imageURL={result.profileImageURL} onOpen={onOpenProfile} />

      {result.relationship === "NONE" && (
        <ActionIcon icon={UserPlus} label={t("friends.addFriend")} variant="primary" busy={busy} onClick={onAdd} />
      )}
      {result.relationship === "PENDING_SENT" && <StatusPill icon={Clock} label={t("friends.pendingSent")} />}
      {result.relationship === "PENDING_RECEIVED" && <StatusPill icon={Inbox} label={t("friends.incomingTitle")} />}
      {result.relationship === "FRIENDS" && <ActionIcon icon={UserMinus} label={t("friends.remove")} busy={busy} onClick={onRemove} />}
    </li>
  );
}

// Icon-only, tooltip via title/aria-label — keeps rows compact regardless of
// name length or how many actions a row has (e.g. Accept + Decline side by
// side), and reads as more "app-like" than text pills.
function ActionIcon({
  icon: Icon,
  label,
  onClick,
  variant = "secondary",
  busy = false,
}: {
  icon: typeof Search;
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-label={label}
      title={label}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-200 disabled:pointer-events-none disabled:opacity-40 ${
        variant === "primary"
          ? "bg-white text-neutral-900 hover:scale-105"
          : "border border-foreground/15 text-foreground/60 hover:scale-105 hover:bg-foreground/10 hover:text-foreground"
      }`}
    >
      {busy ? <Spinner size={13} /> : <Icon size={15} />}
    </button>
  );
}

// Passive (non-clickable) state label — PENDING_SENT/PENDING_RECEIVED rows
// have nothing to act on from the search tab (see note above), just a
// same-sized icon+pill to keep row heights visually consistent.
function StatusPill({ icon: Icon, label }: { icon: typeof Search; label: string }) {
  return (
    <span
      title={label}
      className="flex h-9 items-center gap-1.5 rounded-full border border-foreground/10 px-3 text-xs font-semibold text-foreground/45"
    >
      <Icon size={13} />
      <span className="hidden sm:inline">{label}</span>
    </span>
  );
}
