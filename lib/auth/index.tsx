"use client";

import { createContext, useContext } from "react";
import type { UserResource } from "@clerk/shared/types";

/**
 * The visitor's auth state, for the whole app — the subset of Clerk's
 * useUser()/useAuth() the site uses, with the same shapes, so call sites
 * only swap their import from "@clerk/nextjs" to "@/lib/auth".
 *
 * Why not Clerk's own hooks: they need <ClerkProvider>, and that alone is
 * ~230 KB of JavaScript (the React SDK, clerk-js and its UI bundle) — over
 * half of every page's JS. Visitors who aren't signed in (most of them)
 * never load it now: lib/auth/auth-root.tsx only mounts Clerk when the
 * session cookie says someone is signed in, or on /sign-in and /sign-up.
 * Inside Clerk, ClerkBridge (lib/auth/clerk-root.tsx) feeds this context
 * from the real hooks; without it, the default below says "signed out".
 *
 * Only type imports from Clerk here — a value import would pull it back in.
 */
export type AuthState = {
  isLoaded: boolean;
  isSignedIn: boolean | undefined;
  user: UserResource | null | undefined;
  userId: string | null | undefined;
  getToken: () => Promise<string | null>;
};

const SIGNED_OUT: AuthState = {
  isLoaded: true,
  isSignedIn: false,
  user: null,
  userId: null,
  getToken: async () => null,
};

export const AuthContext = createContext<AuthState>(SIGNED_OUT);

/** Same shape as Clerk's useUser(). */
export function useUser() {
  const { isLoaded, isSignedIn, user } = useContext(AuthContext);
  return { isLoaded, isSignedIn, user };
}

/** Same shape as Clerk's useAuth() — the fields the site uses. */
export function useAuth() {
  const { isLoaded, isSignedIn, userId, getToken } = useContext(AuthContext);
  return { isLoaded, isSignedIn, userId, getToken };
}
