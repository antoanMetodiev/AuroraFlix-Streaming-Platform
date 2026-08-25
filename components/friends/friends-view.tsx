"use client";

import { Footer } from "@/components/layout/footer";
import { FriendsPanel } from "@/components/friends/friends-panel";
import { useTranslation } from "@/lib/i18n/locale-context";

// Full-page wrapper around FriendsPanel — reachable by direct URL/bookmark.
// The primary entry point day-to-day is the compact FriendsModal from the nav.
export function FriendsView() {
  const { t } = useTranslation();

  return (
    <div className="relative min-h-screen w-full">
      <div className="mx-auto flex w-full max-w-xl flex-col px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{t("friends.title")}</h1>
        <div className="mt-6">
          <FriendsPanel />
        </div>
      </div>

      <Footer />
    </div>
  );
}
