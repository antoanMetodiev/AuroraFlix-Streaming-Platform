"use client";

import { useMemo, type ReactNode } from "react";
import { useAuth as useClerkAuth, useUser as useClerkUser } from "@clerk/nextjs";
import { ClerkLocalizedProvider } from "@/components/providers/clerk-localized-provider";
import { AuthContext, type AuthState } from "@/lib/auth";

/** Clerk's state → AuthContext, so the rest of the app never imports Clerk itself. */
function ClerkBridge({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, user } = useClerkUser();
  const { userId, getToken } = useClerkAuth();
  const value = useMemo<AuthState>(
    () => ({ isLoaded, isSignedIn, user, userId, getToken: () => getToken() }),
    [isLoaded, isSignedIn, user, userId, getToken]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Everything Clerk, in one module that lib/auth/auth-root.tsx loads only when
 * it's needed — never imported statically anywhere else.
 */
export default function ClerkRoot({ publishableKey, children }: { publishableKey?: string; children: ReactNode }) {
  return (
    <ClerkLocalizedProvider publishableKey={publishableKey}>
      <ClerkBridge>{children}</ClerkBridge>
    </ClerkLocalizedProvider>
  );
}
