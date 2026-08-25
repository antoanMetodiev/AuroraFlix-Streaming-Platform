"use client";

import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";
import { CreditCard } from "lucide-react";
import { useTranslation } from "@/lib/i18n/locale-context";

// Client-side (useUser, not the server-only <Show>) so this can be reused freely
// in both the desktop bar and the mobile dropdown, same as NavSearch/LanguageToggle.
export function AuthNav({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) {
    return <div className={`h-8 w-8 shrink-0 animate-pulse rounded-full bg-foreground/10 ${className}`} />;
  }

  if (isSignedIn) {
    return (
      <div className={className}>
        <UserButton>
          <UserButton.MenuItems>
            <UserButton.Link label={t("nav.subscription")} labelIcon={<CreditCard size={16} />} href="/account/subscription" />
          </UserButton.MenuItems>
        </UserButton>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <SignInButton mode="modal">
        <button
          type="button"
          className="rounded-full px-3.5 py-2 text-sm font-semibold whitespace-nowrap text-foreground/70 transition-colors duration-300 hover:bg-foreground/10 hover:text-foreground"
        >
          {t("nav.signIn")}
        </button>
      </SignInButton>
      <SignUpButton mode="modal">
        <button
          type="button"
          className="rounded-full bg-white px-3.5 py-2 text-sm font-semibold whitespace-nowrap text-neutral-900 shadow-[0_4px_16px_-4px_rgba(255,255,255,0.55)] transition-transform duration-300 hover:-translate-y-0.5"
        >
          {t("nav.signUp")}
        </button>
      </SignUpButton>
    </div>
  );
}
