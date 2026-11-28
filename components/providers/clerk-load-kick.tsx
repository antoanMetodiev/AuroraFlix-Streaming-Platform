"use client";

import { useEffect } from "react";

type ClerkGlobal = { status?: string; loaded?: boolean; load?: () => Promise<void> };

function getClerk(): ClerkGlobal | undefined {
  return (window as unknown as { Clerk?: ClerkGlobal }).Clerk;
}

// How long <ClerkProvider> gets to load Clerk on its own before this steps in.
const FALLBACK_AFTER_MS = 8000;

// History: without proxy.ts (removed for Cloudflare Workers — see
// lib/clerk-auth.ts), the Clerk version of August 2026 never called
// clerk.load() itself, so window.Clerk sat at "loading" forever and AuthNav
// never left its skeleton. This used to call load() every 200 ms right away.
//
// Current @clerk/react loads by itself — but first downloads the separate UI
// bundle and then calls load({ ui: { ClerkUI } }). The early kick won that
// race, loaded Clerk WITHOUT its UI, and <UserButton> then threw "Clerk was
// not loaded with Ui components", taking the whole page down for signed-in
// visitors ("Нещо се обърка"). So now it's only a last-resort fallback: it
// fires only if Clerk still hasn't loaded long after the provider had every
// chance to do it properly (and says so in the console, so we'd know).
export function ClerkLoadKick() {
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const clerk = getClerk();
      if (clerk && !clerk.loaded && clerk.status === "loading" && typeof clerk.load === "function") {
        console.warn("[ClerkLoadKick] Clerk still loading after 8s — calling load() as a fallback");
        clerk.load().catch(() => {});
      }
    }, FALLBACK_AFTER_MS);
    return () => window.clearTimeout(timeout);
  }, []);

  return null;
}
