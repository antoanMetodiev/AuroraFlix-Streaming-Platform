"use client";

import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { bgBG, enUS } from "@clerk/localizations";
import { useLocale } from "@/lib/i18n/locale-context";
import { ClerkLoadKick } from "@/components/providers/clerk-load-kick";

// bgBG's own delete-account confirmation phrase ("Изтриване на акаунта") never
// unblocks the confirm button — confirmed the localization string itself has
// no hidden characters, so this looks like Clerk's own confirmation-match
// logic only accepting Latin/word-character input (e.g. a `\w`-based check,
// which is ASCII-only unless explicitly Unicode-aware) and never matching
// Cyrillic. Overriding just this one phrase to a Latin string works around it
// without touching any other Bulgarian text in the rest of Clerk's UI.
const bgBGUserProfile = bgBG.userProfile ?? {};
const bgBGWithLatinDeleteConfirm = {
  ...bgBG,
  userProfile: {
    ...bgBGUserProfile,
    deletePage: {
      ...bgBGUserProfile.deletePage,
      actionDescription: 'Напишете "Delete account" по-долу, за да продължите.',
      confirm: "Delete account",
    },
  },
};

// Clerk's own UI (SignIn/SignUp/UserButton) follows the site's EN/BG toggle,
// and is themed to match the app's dark, white-accent look instead of Clerk's defaults.
export function ClerkLocalizedProvider({ children, publishableKey }: { children: ReactNode; publishableKey?: string }) {
  const { locale } = useLocale();

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      localization={locale === "bg" ? bgBGWithLatinDeleteConfirm : enUS}
      appearance={{
        theme: dark,
        variables: {
          colorPrimary: "#ffffff",
          colorBackground: "#121212",
          colorInput: "rgba(255,255,255,0.06)",
          colorInputForeground: "#ffffff",
          borderRadius: "0.75rem",
        },
        elements: {
          card: "bg-[rgba(28,24,48,0.97)] border border-white/10 shadow-[0_20px_45px_rgba(0,0,0,0.55)]",
          formButtonPrimary: "bg-white text-neutral-900 hover:opacity-90 text-sm normal-case",
          footerActionLink: "text-white hover:text-white/70",
        },
      }}
    >
      <ClerkLoadKick />
      {children}
    </ClerkProvider>
  );
}
