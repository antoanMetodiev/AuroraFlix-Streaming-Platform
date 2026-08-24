"use client";

import { useEffect } from "react";

type ClerkGlobal = { status?: string; load?: () => Promise<void> };

function getClerk(): ClerkGlobal | undefined {
  return (window as unknown as { Clerk?: ClerkGlobal }).Clerk;
}

// Without proxy.ts (removed for Cloudflare Workers — @opennextjs/cloudflare
// can't build a Node.js middleware, see lib/clerk-auth.ts), <ClerkProvider>'s
// own mount effect never calls clerk.load() on this deployment: window.Clerk
// gets stuck at status "loading" forever, so useUser()/isLoaded never
// resolves and AuthNav shows its loading skeleton indefinitely. Manually
// kicking load() here — confirmed to resolve instantly once called — fixes
// it without touching middleware/runtime.
export function ClerkLoadKick() {
  useEffect(() => {
    const kick = () => {
      const clerk = getClerk();
      if (!clerk) return false;
      if (clerk.status === "loading" && typeof clerk.load === "function") {
        clerk.load().catch(() => {});
      }
      return true;
    };

    if (kick()) return;

    // window.Clerk hasn't been constructed yet (script still downloading) — retry briefly.
    const interval = window.setInterval(() => {
      if (kick()) window.clearInterval(interval);
    }, 200);
    const timeout = window.setTimeout(() => window.clearInterval(interval), 5000);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, []);

  return null;
}
