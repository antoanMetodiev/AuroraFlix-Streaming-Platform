"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { refreshAccountProgress, setProgressAccount } from "@/lib/watch-progress";

/**
 * Tells lib/watch-progress whose positions to use: the signed-in account's,
 * or this browser's. Renders nothing.
 */
export function WatchProgressAccount() {
  const { isLoaded, user } = useUser();
  const userId = user?.id ?? null;

  useEffect(() => {
    if (isLoaded) setProgressAccount(userId);
  }, [isLoaded, userId]);

  useEffect(() => {
    function handleVisible() {
      if (document.visibilityState === "visible") refreshAccountProgress();
    }
    document.addEventListener("visibilitychange", handleVisible);
    return () => document.removeEventListener("visibilitychange", handleVisible);
  }, []);

  return null;
}
