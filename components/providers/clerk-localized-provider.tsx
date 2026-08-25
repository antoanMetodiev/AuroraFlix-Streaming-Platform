"use client";

import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { bgBG, enUS } from "@clerk/localizations";
import { useLocale } from "@/lib/i18n/locale-context";
import { ClerkLoadKick } from "@/components/providers/clerk-load-kick";

// Clerk's own UI (SignIn/SignUp/UserButton) follows the site's EN/BG toggle,
// and is themed to match the app's dark, white-accent look instead of Clerk's defaults.
export function ClerkLocalizedProvider({ children }: { children: ReactNode }) {
  const { locale } = useLocale();

  return (
    <ClerkProvider
      localization={locale === "bg" ? bgBG : enUS}
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
