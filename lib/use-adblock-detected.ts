"use client";

import { useEffect, useState } from "react";

/**
 * Classic ad-blocker detection: an off-screen bait element carrying classnames
 * every major cosmetic filter list (EasyList etc.) hides — ad blockers apply
 * that hiding within a MutationObserver tick of the element entering the DOM,
 * so a short delay after insertion is enough to tell. Catches blockers that
 * do DOM/CSS-based cosmetic filtering (classic uBlock Origin, AdBlock Plus,
 * Brave Shields' element hiding).
 */
const BAIT_CLASSNAME = "adsbox ad-banner ad-placement adsbygoogle";
const BAIT_CHECK_DELAY_MS = 200;

/**
 * Second, independent check: request a same-origin path with a classic
 * ad-script filename. Deliberately NOT a real third-party ad SDK URL (e.g.
 * Google's adsbygoogle.js) — those are common enough that blockers ship a
 * "surrogate" for them (a harmless stand-in file, swapped in via
 * declarativeNetRequest's redirect action) specifically so pages depending on
 * them don't break. A surrogate still resolves as a normal, successful load,
 * so testing against one silently fails to detect anything.
 *
 * A path like "/ads.js" has no such compatibility exception — every major
 * filter list (EasyList included, which uBlock Origin/Lite/AdGuard/Brave all
 * ship) matches this exact classic filename generically, regardless of which
 * domain serves it, and blockers just cancel the request outright. fetch()
 * throws for that kind of client-side cancellation (net::ERR_BLOCKED_BY_
 * CLIENT) but resolves normally for a plain 404 — which is what this path
 * actually is, since nothing here serves it — so throw vs. resolve cleanly
 * tells "blocked" apart from "no such file".
 */
async function checkAdPathBlocked(): Promise<boolean> {
  try {
    await fetch("/ads.js", { method: "HEAD", cache: "no-store" });
    return false;
  } catch {
    return true;
  }
}

// Brave's own official, documented feature-detection API — Shields blocks
// ads/trackers by default on every site, so a positive result here means
// there's no point asking the user to also install a separate extension.
async function isBraveBrowser(): Promise<boolean> {
  const brave = (navigator as unknown as { brave?: { isBrave?: () => Promise<boolean> } }).brave;
  if (!brave?.isBrave) return false;
  try {
    return await brave.isBrave();
  } catch {
    return false;
  }
}

function checkBaitElementBlocked(): Promise<boolean> {
  return new Promise((resolve) => {
    const bait = document.createElement("div");
    bait.className = BAIT_CLASSNAME;
    Object.assign(bait.style, {
      position: "absolute",
      top: "-9999px",
      left: "-9999px",
      width: "1px",
      height: "1px",
    });
    document.body.appendChild(bait);

    window.setTimeout(() => {
      const blocked =
        !document.body.contains(bait) || bait.offsetHeight === 0 || getComputedStyle(bait).display === "none";
      bait.remove();
      resolve(blocked);
    }, BAIT_CHECK_DELAY_MS);
  });
}

export function useAdblockDetected() {
  const [hasAdblock, setHasAdblock] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [baitBlocked, pathBlocked, brave] = await Promise.all([
        checkBaitElementBlocked(),
        checkAdPathBlocked(),
        isBraveBrowser(),
      ]);
      if (!cancelled) setHasAdblock(baitBlocked || pathBlocked || brave);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return hasAdblock;
}
