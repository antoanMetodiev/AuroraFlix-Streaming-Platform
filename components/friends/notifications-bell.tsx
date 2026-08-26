"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Bell } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { UserProfileModal } from "@/components/friends/user-profile-modal";
import { consumeNotifications, getNotificationCount, type FriendNotification } from "@/lib/friends";
import { subscribeFriendsEvent } from "@/lib/friends-events";
import { useTranslation } from "@/lib/i18n/locale-context";

type ProfileTarget = { clerkId: string; displayName: string | null; profileImageURL: string | null };

// Reconciliation fallback in case a WS push was missed (dropped connection,
// tab was backgrounded, etc.) — the badge is primarily driven by
// lib/friends-events (see FriendsSocketManager), this just keeps it honest.
const POLL_INTERVAL_MS = 25_000;

// A persistent log ("user X sent you a request", "user X accepted your
// request") distinct from FriendsNavButton's badge, which only ever
// reflects *currently pending* requests — the user needs to be told about
// these events even if they never open the friends modal at all. Opening
// this tray consumes (deletes) the notifications server-side.
export function NotificationsBell({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  const { isSignedIn } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<FriendNotification[] | null>(null);
  const [profile, setProfile] = useState<ProfileTarget | null>(null);

  useEffect(() => {
    if (!isSignedIn) return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    const poll = async () => {
      const next = await getNotificationCount();
      if (cancelled) return;
      setCount(next);
      timeoutId = setTimeout(poll, POLL_INTERVAL_MS);
    };
    poll();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [isSignedIn]);

  useEffect(() => {
    if (!isSignedIn) return;
    // Any friend-request event (received or accepted) means a fresh
    // notification row is waiting server-side — bump instantly by exactly
    // one instead of waiting for the next poll tick.
    return subscribeFriendsEvent(() => setCount((prev) => prev + 1));
  }, [isSignedIn]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  const handleOpen = async () => {
    setIsOpen(true);
    const consumed = await consumeNotifications();
    setItems(consumed);
    setCount(0);
  };

  const handleClose = () => {
    setIsOpen(false);
    setItems(null);
  };

  if (!isSignedIn) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => (isOpen ? handleClose() : handleOpen())}
        aria-expanded={isOpen}
        aria-label={t("friends.notificationsAria")}
        className={`relative flex h-10 w-10 items-center justify-center rounded-full border border-foreground/10 bg-foreground/5 text-foreground/70 backdrop-blur-xl transition-colors hover:bg-foreground/10 hover:text-foreground ${className}`}
      >
        <Bell size={18} />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-neutral-900">
            +{count}
          </span>
        )}
      </button>

      {isOpen && <div className="fixed inset-0 z-30" onClick={handleClose} />}

      <div
        className={`fixed inset-x-3 top-[4.25rem] z-40 origin-top rounded-2xl border border-foreground/10 bg-surface p-2 shadow-[0_20px_45px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-all duration-200 ease-out sm:absolute sm:inset-x-auto sm:top-13 sm:right-0 sm:origin-top-right sm:w-80 ${
          isOpen ? "pointer-events-auto scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
        }`}
      >
        {items === null ? (
          <p className="px-2 py-4 text-center text-sm text-foreground/50">{t("friends.notificationsLoading")}</p>
        ) : items.length === 0 ? (
          <p className="px-2 py-4 text-center text-sm text-foreground/50">{t("friends.notificationsEmpty")}</p>
        ) : (
          <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto">
            {items.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => setProfile({ clerkId: n.actorId, displayName: n.actorDisplayName, profileImageURL: n.actorProfileImageURL })}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors duration-150 hover:bg-foreground/10"
                >
                  <Avatar src={n.actorProfileImageURL} name={n.actorDisplayName} size={28} />
                  <p className="min-w-0 flex-1 text-sm text-foreground/85">
                    <span className="font-semibold">{n.actorDisplayName || "?"}</span>{" "}
                    {n.type === "FRIEND_REQUEST"
                      ? t("friends.notifSentRequest")
                      : n.type === "FRIEND_REQUEST_ACCEPTED"
                        ? t("friends.notifAcceptedRequest")
                        : t("friends.notifDeclinedRequest")}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {profile && (
        <UserProfileModal
          clerkId={profile.clerkId}
          displayName={profile.displayName}
          profileImageURL={profile.profileImageURL}
          onClose={() => setProfile(null)}
          onNavigate={handleClose}
        />
      )}
    </div>
  );
}
