"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Users } from "lucide-react";
import { FriendsModal } from "@/components/friends/friends-modal";
import { Avatar } from "@/components/ui/avatar";
import { WatchingFriendCard } from "@/components/friends/watching-friend-card";
import { getIncomingRequests } from "@/lib/friends";
import { subscribeFriendsEvent } from "@/lib/friends-events";
import { useFriends } from "@/lib/use-friends";
import { useTranslation } from "@/lib/i18n/locale-context";

// How many overlapping avatar bubbles to show before collapsing the rest
// into a "+N" pill — past this, the cluster would eat too much nav space.
const MAX_WATCHING_AVATARS = 3;

// Low-urgency background poll for the incoming-request badge — setTimeout
// chaining (not setInterval) so a slow request can't overlap the next tick,
// same shape as CheckoutResultOverlay's polling but recurring forever
// instead of giving up after a fixed budget.
const POLL_INTERVAL_MS = 25_000;

export function FriendsNavButton({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  const { isSignedIn } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [isWatchingOpen, setIsWatchingOpen] = useState(false);
  const [incomingCount, setIncomingCount] = useState(0);
  const watchingRef = useRef<HTMLDivElement>(null);
  // Separate from the incoming-count polling above (kept untouched) — this
  // reuses useFriends' own fetch+live-push wiring purely for the "who's
  // watching what" cluster below, same shape as watching-toast.tsx.
  const { friends, watching } = useFriends();
  const watchingFriends = friends.filter((friend) => watching[friend.clerkId]);

  useEffect(() => {
    if (!isWatchingOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (watchingRef.current && !watchingRef.current.contains(event.target as Node)) setIsWatchingOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [isWatchingOpen]);

  const refreshCount = useCallback(async () => {
    const list = await getIncomingRequests();
    setIncomingCount(list.length);
  }, []);

  useEffect(() => {
    if (!isSignedIn) return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    const poll = async () => {
      const list = await getIncomingRequests();
      if (cancelled) return;
      setIncomingCount(list.length);
      timeoutId = setTimeout(poll, POLL_INTERVAL_MS);
    };
    poll();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [isSignedIn]);

  // Instant refresh the moment a friend-request event arrives (received, or
  // one of ours got accepted), instead of waiting for the next poll tick —
  // the poll above keeps running underneath regardless. Subscribes to the
  // shared event bus rather than opening its own socket — see
  // FriendsSocketManager, the single owner of the actual connection.
  useEffect(() => {
    if (!isSignedIn) return;
    return subscribeFriendsEvent(() => refreshCount());
  }, [isSignedIn, refreshCount]);

  // Re-check right after the modal closes so accept/decline/send actions
  // taken inside it are reflected in the badge without waiting for the next
  // scheduled poll tick.
  const handleClose = () => {
    setIsOpen(false);
    if (isSignedIn) refreshCount();
  };

  if (!isSignedIn) return null;

  return (
    <>
      <div className="flex items-center">
        {/* xl+ gets WatchingFriendsSidebar's persistent rail instead — this
            cluster is the sm..xl equivalent (real phones below sm still have
            nothing here; see WatchingFriendsMobilePill for that gap). Tap
            opens the same rich cards a hover tooltip could never show on a
            touch device anyway. */}
        {watchingFriends.length > 0 && (
          <div ref={watchingRef} className="relative mr-1.5 hidden sm:block xl:hidden">
            <button
              type="button"
              onClick={() => setIsWatchingOpen((prev) => !prev)}
              aria-label={t("friends.watchingAria")}
              className="flex items-center -space-x-2.5"
            >
              {watchingFriends.slice(0, MAX_WATCHING_AVATARS).map((friend) => (
                <span key={friend.clerkId} className="relative rounded-full ring-2 ring-background">
                  <Avatar src={friend.profileImageURL} name={friend.displayName} size={26} />
                  <span className="absolute right-0 bottom-0 h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400 ring-2 ring-background" />
                </span>
              ))}
              {watchingFriends.length > MAX_WATCHING_AVATARS && (
                <span className="relative flex h-[26px] w-[26px] items-center justify-center rounded-full bg-foreground/15 text-[10px] font-bold text-foreground/80 ring-2 ring-background">
                  +{watchingFriends.length - MAX_WATCHING_AVATARS}
                </span>
              )}
            </button>

            <div
              className={`absolute top-full right-0 z-40 mt-2 flex w-72 origin-top-right flex-col gap-1 rounded-2xl border border-foreground/10 bg-surface p-2 shadow-[0_20px_45px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-all duration-200 ease-out ${
                isWatchingOpen ? "pointer-events-auto scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
              }`}
            >
              {watchingFriends.map((friend) => (
                <WatchingFriendCard key={friend.clerkId} friend={friend} watching={watching[friend.clerkId]} onNavigate={() => setIsWatchingOpen(false)} />
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label={t("friends.usersAria")}
          className={`relative flex h-10 w-10 items-center justify-center rounded-full border border-foreground/10 bg-foreground/5 text-foreground/70 backdrop-blur-xl transition-colors hover:bg-foreground/10 hover:text-foreground ${className}`}
        >
          <Users size={18} />
          {incomingCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-neutral-900">
              {incomingCount}
            </span>
          )}
        </button>
      </div>

      {isOpen && <FriendsModal onClose={handleClose} />}
    </>
  );
}
