"use client";

import { UserButton } from "@clerk/nextjs";

/**
 * Clerk's account menu. Its own module, loaded by AuthNav only for a signed-in
 * visitor — who always has Clerk mounted (lib/auth/auth-root.tsx).
 */
export default function UserMenu() {
  return (
    <UserButton>
      {/* PAYMENTS DISABLED
      <UserButton.MenuItems>
        <UserButton.Link label={t("nav.subscription")} labelIcon={<CreditCard size={16} />} href="/account/subscription" />
      </UserButton.MenuItems>
      */}
    </UserButton>
  );
}
