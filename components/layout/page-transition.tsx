"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Smooth page changes. Clicking a link to another page gently dims and
 * lifts the current page while the next one loads (.page-leaving); the new
 * page then rises and fades in (.page-enter). Filter / pagination changes
 * (same path, new query) don't animate.
 *
 * Only opacity and `top` (with position: relative) are animated — never
 * transform / filter / translate: those would make this wrapper the
 * containing block for every `position: fixed` thing inside a page (the
 * blurred page backgrounds, the full-screen loader, the player's big view)
 * and squash them into the page box mid-animation.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // The path being left: only that page dims, never the one that replaces it.
  const [leavingFrom, setLeavingFrom] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      setLeavingFrom(window.location.pathname);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      // A navigation that never happens (blocked, failed) mustn't leave the page dimmed.
      timeoutRef.current = window.setTimeout(() => setLeavingFrom(null), 4000);
    };
    // Capture phase: next/link calls preventDefault on its own click (it navigates
    // client-side), so a bubbling listener would see every link as "handled".
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // A new path mounts a fresh wrapper (below), which plays the enter animation.
  useEffect(() => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the route just changed; the old page's dim state ends with it
    setLeavingFrom(null);
  }, [pathname]);

  return (
    <div key={pathname} className={`page-enter relative flex flex-1 flex-col ${leavingFrom === pathname ? "page-leaving" : ""}`}>
      {children}
    </div>
  );
}
