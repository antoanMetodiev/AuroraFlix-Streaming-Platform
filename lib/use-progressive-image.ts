"use client";

import { useEffect, useState } from "react";

/**
 * Same strategy as the old app's BigImage component: show the low-res URL
 * immediately, then silently preload the high-res one off-DOM in the
 * background. Only switch over once that preload has actually finished (i.e.
 * it's already sitting in the browser's HTTP cache) — so the upgrade never
 * shows a spinner or stalls the UI, it just quietly gets sharper once ready.
 */
export function useProgressiveImage(lowResUrl: string | null, highResUrl: string | null) {
  // Keyed by the highResUrl it was preloaded for, so switching subjects (e.g. a
  // different movie) can't briefly flash the previous one's high-res image.
  const [resolved, setResolved] = useState<{ for: string; url: string } | null>(null);

  useEffect(() => {
    if (!highResUrl) return;
    const preload = new window.Image();
    preload.src = highResUrl;
    preload.onload = () => setResolved({ for: highResUrl, url: highResUrl });
  }, [highResUrl]);

  const isHighRes = resolved?.for === highResUrl;
  return { src: (isHighRes ? resolved?.url : null) ?? lowResUrl, isHighRes };
}
