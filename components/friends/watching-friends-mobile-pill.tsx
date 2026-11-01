"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { WatchingFriendCard } from "@/components/friends/watching-friend-card";
import { useFriends } from "@/lib/use-friends";
import { useTranslation } from "@/lib/i18n/locale-context";

const MAX_AVATARS = 3;

/**
 * Who of your friends is watching right now — on every screen size the same
 * small pill as in the Android app: just their avatars, bottom-right (above
 * MobileTabBar on phones). Only a click opens the cards with what each one
 * is watching. It replaced the header's avatar cluster and the xl "active
 * now" rail, which spelled every title out at the top of the page.
 * WatchingToastManager's toasts stack above it in the same corner.
 */
export function WatchingFriendsMobilePill() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { friends, watching } = useFriends();
  const watchingFriends = friends.filter((friend) => watching[friend.clerkId]);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [isOpen]);

  if (watchingFriends.length === 0) return null;

  return (
    <div ref={containerRef} className="fixed right-3 bottom-20 z-40 md:right-4 md:bottom-4">
      <div
        className={`absolute right-0 bottom-full mb-2 flex max-h-[60vh] w-[calc(100vw-1.5rem)] max-w-xs origin-bottom-right flex-col gap-1 overflow-y-auto rounded-2xl border border-foreground/10 bg-surface p-2 shadow-[0_20px_45px_rgba(0,0,0,0.4)] backdrop-blur-xl transition-all duration-200 ease-out ${
          isOpen ? "pointer-events-auto scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
        }`}
      >
        <p className="px-2 pt-1 pb-1.5 text-xs font-semibold tracking-wide text-foreground/50 uppercase">{t("friends.watchingNow")}</p>
        {watchingFriends.map((friend) => (
          <WatchingFriendCard key={friend.clerkId} friend={friend} watching={watching[friend.clerkId]} onNavigate={() => setIsOpen(false)} />
        ))}
      </div>

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={t("friends.watchingAria")}
        className="flex items-center gap-1 rounded-full border border-foreground/10 bg-surface/90 py-1.5 pr-3 pl-1.5 shadow-[0_8px_25px_-8px_rgba(0,0,0,0.6)] backdrop-blur-xl"
      >
        {isOpen ? (
          <span className="flex h-[26px] w-[26px] items-center justify-center">
            <X size={14} className="text-foreground/70" />
          </span>
        ) : (
          <span className="flex items-center -space-x-2.5">
            {watchingFriends.slice(0, MAX_AVATARS).map((friend) => (
              <span key={friend.clerkId} className="relative rounded-full ring-2 ring-surface">
                <Avatar src={friend.profileImageURL} name={friend.displayName} size={26} />
                <span className="absolute right-0 bottom-0 h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400 ring-2 ring-surface" />
              </span>
            ))}
            {watchingFriends.length > MAX_AVATARS && (
              <span className="relative flex h-[26px] w-[26px] items-center justify-center rounded-full bg-foreground/15 text-[0.625rem] font-bold text-foreground/80 ring-2 ring-surface">
                +{watchingFriends.length - MAX_AVATARS}
              </span>
            )}
          </span>
        )}
      </button>
    </div>
  );
}
