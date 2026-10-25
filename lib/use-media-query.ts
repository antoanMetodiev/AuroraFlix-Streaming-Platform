"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether a CSS media query currently matches, kept live. The server (and
 * hydration) render uses `serverValue`, then it settles on the real answer.
 */
export function useMediaQuery(query: string, serverValue = false) {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => serverValue
  );
}
