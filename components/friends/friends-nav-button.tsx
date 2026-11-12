"use client";

import { NAV_BADGE, NAV_ICON_BUTTON } from "@/components/layout/nav-styles";

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
          className={`${NAV_ICON_BUTTON} ${className}`}
        >
          <Users size={18} />
          {incomingCount > 0 && (
            <span className={NAV_BADGE}>
              {incomingCount}
            </span>
          )}
        </button>
      </div>

      {isOpen && <FriendsModal onClose={handleClose} />}
    </>
  );
}
