"use client";

import { useEffect, useState } from "react";
import { BlurredPageBackdrop } from "@/components/movies/details/details-background";

const LAST_KEY = "home-backdrop-last";

/**
 * The homepage's blurred page background (everything below the hero): a
 * random trending poster, picked anew every time the homepage is opened —
 * on mount, so it changes on client-side navigation back to "/" too, not
 * only on a full reload. The last one shown is remembered for the tab, so
 * the same poster never comes up twice in a row.
 */
export function HomeBackdrop({ posters }: { posters: string[] }) {
  const [path, setPath] = useState<string | null>(null);

  useEffect(() => {
    if (posters.length === 0) return;
    let last: string | null = null;
    try {
      last = sessionStorage.getItem(LAST_KEY);
    } catch {}
    const candidates = posters.length > 1 ? posters.filter((poster) => poster !== last) : posters;
    const next = candidates[Math.floor(Math.random() * candidates.length)];
    try {
      sessionStorage.setItem(LAST_KEY, next);
    } catch {}
    // Random, so it can only be picked after hydration (the server's pick would never match).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPath(next);
  }, [posters]);

  return <BlurredPageBackdrop path={path} />;
}
