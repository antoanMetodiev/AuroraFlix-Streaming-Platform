"use client";

import { useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { WatchProgressAccount } from "@/components/providers/watch-progress-account";

// Clerk's whole client (SDK, clerk-js, UI) lives behind this import.
const ClerkRoot = dynamic(() => import("@/lib/auth/clerk-root"));

/** Pages that are Clerk itself — they always need it, signed in or not. */
function isAuthPage(pathname: string) {
  return /^\/(sign-in|sign-up)(\/|$)/.test(pathname);
}

/**
 * Mounts Clerk only for visitors who need it: `signedIn` comes from the
 * server (the session cookie Clerk sets — see hasClerkSession), and the
 * sign-in / sign-up pages always need it. Everyone else gets the signed-out
 * defaults of lib/auth without downloading Clerk at all; "Sign in" in the
 * header is a link to /sign-in, where Clerk loads.
 *
 * Once on, it stays on for the rest of the visit: after signing in, Clerk
 * navigates back into the app and has to keep running there (it refreshes
 * the short-lived session token). Switching it on wraps the app in a new
 * provider, which remounts the page — that only happens on the way into
 * /sign-in or /sign-up, which is a page change anyway.
 */
export function AuthRoot({
  signedIn,
  publishableKey,
  children,
}: {
  signedIn: boolean;
  /**
   * From the server, at request time (wrangler.jsonc vars) — never read
   * process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY in client code: that is
   * inlined at build time, and the Workers build doesn't have it, so the
   * browser got no key and Clerk never loaded.
   */
  publishableKey?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [withClerk, setWithClerk] = useState(signedIn || isAuthPage(pathname));
  // Adjusting state during render (no effect, no extra paint): a client-side
  // navigation into /sign-in or /sign-up turns Clerk on.
  if (!withClerk && isAuthPage(pathname)) setWithClerk(true);

  const content = (
    <>
      <WatchProgressAccount />
      {children}
    </>
  );
  return withClerk ? <ClerkRoot publishableKey={publishableKey}>{content}</ClerkRoot> : content;
}
