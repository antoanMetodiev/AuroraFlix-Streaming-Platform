"use client";

import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { enUS } from "@clerk/localizations";
import { ClerkLoadKick } from "@/components/providers/clerk-load-kick";

// Always English, regardless of the site's own EN/BG toggle — bgBG's
// delete-account confirmation step never unblocks its confirm button no
// matter what the confirmation phrase itself says (confirmed by testing:
// overriding just that one string to a Latin phrase, while leaving the rest
// of the UI on bg-BG, still didn't work; only switching entirely to enUS
// does). That points to the bug being tied to Clerk's overall detected
// locale, not just displayed text — and there's no per-component/per-page
// localization override in Clerk's API (`<UserButton userProfileProps>` only
// accepts additionalOAuthScopes/appearance/customPages/apiKeysProps, no
// localization) to scope a fix to just that one panel. A working delete
// flow matters more than Clerk's own chrome matching the site's language, so
// this is deliberately hardcoded rather than following `useLocale()`.
export function ClerkLocalizedProvider({ children, publishableKey }: { children: ReactNode; publishableKey?: string }) {
  return (
    <ClerkProvider
      publishableKey={publishableKey}
      localization={enUS}
      appearance={{
        theme: dark,
        variables: {
          colorPrimary: "#ffffff",
          colorBackground: "#000000",
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
