"use client";

import { useCallback, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Users } from "lucide-react";
import { FriendsModal } from "@/components/friends/friends-modal";
import { getIncomingRequests } from "@/lib/friends";
import { subscribeFriendsEvent } from "@/lib/friends-events";
import { useTranslation } from "@/lib/i18n/locale-context";

// Low-urgency background poll for the incoming-request badge — setTimeout
// chaining (not setInterval) so a slow request can't overlap the next tick,
// same shape as CheckoutResultOverlay's polling but recurring forever
// instead of giving up after a fixed budget.
const POLL_INTERVAL_MS = 25_000;

export function FriendsNavButton({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  const { isSignedIn } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [incomingCount, setIncomingCount] = useState(0);

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

      {isOpen && <FriendsModal onClose={handleClose} />}
    </>
  );
}
