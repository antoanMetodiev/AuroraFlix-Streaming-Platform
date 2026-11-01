"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Users } from "lucide-react";
import { FriendsModal } from "@/components/friends/friends-modal";
import { useFriends } from "@/lib/use-friends";
import { useTranslation } from "@/lib/i18n/locale-context";

export function FriendsNavButton({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  const { isSignedIn } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  // The badge counts useFriends' incoming list rather than running its own
  // fetch and its own poll beside it. Two independent readers of the same
  // endpoint answered at different moments, so the badge and the panel this
  // button opens routinely disagreed — the badge advertising a request the
  // panel didn't list, or still showing one the panel had just let you
  // decline. One list, one answer.
  // Who's watching what lives in WatchingFriendsMobilePill (bottom-right).
  const { incoming, refresh } = useFriends();
  const incomingCount = incoming.length;

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
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label={t("friends.usersAria")}
          className={`relative flex h-10 w-10 items-center justify-center rounded-full border border-foreground/10 bg-foreground/5 text-foreground/70 backdrop-blur-xl transition-colors hover:bg-foreground/10 hover:text-foreground ${className}`}
        >
          <Users size={18} />
          {incomingCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[0.625rem] font-bold text-neutral-900">
              {incomingCount}
            </span>
          )}
        </button>
      </div>

      {isOpen && <FriendsModal onClose={handleClose} />}
    </>
  );
}
