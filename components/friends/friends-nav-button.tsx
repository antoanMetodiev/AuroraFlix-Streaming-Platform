"use client";

import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Users } from "lucide-react";
import { FriendsModal } from "@/components/friends/friends-modal";
import { Avatar } from "@/components/ui/avatar";
import { WatchingFriendCard } from "@/components/friends/watching-friend-card";
import { useFriends } from "@/lib/use-friends";
import { useTranslation } from "@/lib/i18n/locale-context";

// How many overlapping avatar bubbles to show before collapsing the rest
// into a "+N" pill — past this, the cluster would eat too much nav space.
const MAX_WATCHING_AVATARS = 3;

export function FriendsNavButton({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  const { isSignedIn } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [isWatchingOpen, setIsWatchingOpen] = useState(false);
  const watchingRef = useRef<HTMLDivElement>(null);
  // The badge counts useFriends' incoming list rather than running its own
  // fetch and its own poll beside it. Two independent readers of the same
  // endpoint answered at different moments, so the badge and the panel this
  // button opens routinely disagreed — the badge advertising a request the
  // panel didn't list, or still showing one the panel had just let you
  // decline. One list, one answer.
  const { friends, incoming, watching, refresh } = useFriends();
  const watchingFriends = friends.filter((friend) => watching[friend.clerkId]);
  const incomingCount = incoming.length;

  useEffect(() => {
    if (!isWatchingOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (watchingRef.current && !watchingRef.current.contains(event.target as Node)) setIsWatchingOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [isWatchingOpen]);

  // Re-check right after the modal closes so accept/decline/send actions
  // taken inside it are reflected without waiting for the next backstop tick
  // — useFriends already refreshes on each of those actions and on every live
  // event, so this is only covering a change made in another tab or by
  // someone else while the modal was open.
  const handleClose = () => {
    setIsOpen(false);
    if (isSignedIn) refresh();
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
