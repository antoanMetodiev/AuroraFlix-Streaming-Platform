"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Inbox, Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Loader, Spinner } from "@/components/ui/loader";
import { useFriends } from "@/lib/use-friends";
import { searchUsers, type FriendRequestItem, type FriendSearchResult } from "@/lib/friends";
import { useTranslation } from "@/lib/i18n/locale-context";

type Tab = "requests" | "friends" | "search";

// The actual friends UI — three separate tabs (received/sent requests,
// friends list, search) instead of everything stacked in one scroll. No
// page/modal chrome of its own, so both /friends (full page) and
// FriendsModal (compact popup) can render the same logic.
export function FriendsPanel() {
  const { t } = useTranslation();
  const { friends, incoming, outgoing, isLoading, accept, cancelOrDecline, send, remove } = useFriends();
  const [tab, setTab] = useState<Tab>("search");

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
              renderActions={(req) => (
                <>
                  <button
                    type="button"
                    onClick={() => accept(req.id)}
                    className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-neutral-900"
                  >
                    {t("friends.accept")}
                  </button>
                  <button
                    type="button"
                    onClick={() => cancelOrDecline(req.id)}
                    className="rounded-full border border-foreground/15 px-3 py-1.5 text-sm font-semibold text-foreground/70"
                  >
                    {t("friends.decline")}
                  </button>
                </>
              )}
            />

            {outgoing.length > 0 && (
              <RequestsList
                title={t("friends.outgoingTitle")}
                items={outgoing}
                renderActions={(req) => (
                  <button
                    type="button"
                    onClick={() => cancelOrDecline(req.id)}
                    className="rounded-full border border-foreground/15 px-3 py-1.5 text-sm font-semibold text-foreground/70"
                  >
                    {t("friends.cancel")}
                  </button>
                )}
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
              <li key={friend.clerkId} className="flex items-center gap-3 rounded-2xl px-2.5 py-2.5 transition-colors duration-150 hover:bg-foreground/5">
                <Avatar src={friend.profileImageURL} name={friend.displayName} size={36} />
                <p className="min-w-0 flex-1 truncate text-sm text-foreground/85">{friend.displayName || "?"}</p>
                <button
                  type="button"
                  onClick={() => remove(friend.clerkId)}
                  className="rounded-full border border-foreground/15 px-3 py-1.5 text-sm font-semibold text-foreground/70"
                >
                  {t("friends.remove")}
                </button>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}

function RequestsList({
  title,
  items,
  emptyLabel,
  renderActions,
}: {
  title: string;
  items: FriendRequestItem[];
  emptyLabel?: string;
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
              <Avatar src={item.profileImageURL} name={item.displayName} size={36} />
              <p className="min-w-0 flex-1 truncate text-sm text-foreground/85">{item.displayName || "?"}</p>
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
}: {
  result: FriendSearchResult;
  busy: boolean;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();

  return (
    <li className="flex items-center gap-3 rounded-2xl px-2.5 py-2.5 transition-colors duration-150 hover:bg-foreground/5">
      <Avatar src={result.profileImageURL} name={result.displayName} size={36} />
      <p className="min-w-0 flex-1 truncate text-sm text-foreground/85">{result.displayName || "?"}</p>

      {result.relationship === "NONE" && (
        <button
          type="button"
          onClick={onAdd}
          disabled={busy}
          className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-neutral-900 disabled:opacity-50"
        >
          {t("friends.addFriend")}
        </button>
      )}
      {result.relationship === "PENDING_SENT" && (
        <span className="rounded-full border border-foreground/15 px-3 py-1.5 text-sm font-semibold text-foreground/50">
          {t("friends.pendingSent")}
        </span>
      )}
      {result.relationship === "PENDING_RECEIVED" && (
        <span className="rounded-full border border-foreground/15 px-3 py-1.5 text-sm font-semibold text-foreground/50">
          {t("friends.incomingTitle")}
        </span>
      )}
      {result.relationship === "FRIENDS" && (
        <button
          type="button"
          onClick={onRemove}
          disabled={busy}
          className="rounded-full border border-foreground/15 px-3 py-1.5 text-sm font-semibold text-foreground/70 disabled:opacity-50"
        >
          {t("friends.remove")}
        </button>
      )}
    </li>
  );
}
