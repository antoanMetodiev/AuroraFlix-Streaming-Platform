"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { registerSmoothScroll } from "@/lib/smooth-scroll";

/**
 * Site-wide inertial smooth scrolling (Lenis): a mouse wheel / trackpad no
 * longer jumps in steps — the page glides and eases to a stop. Mounted once
 * from the root layout; renders nothing.
 *
 * - Touch screens keep their native scrolling (Lenis leaves touch alone by
 *   default) — phones already have momentum, and faking it there feels worse.
 * - Skipped entirely for prefers-reduced-motion.
 * - allowNestedScroll: anything that scrolls on its own (dropdowns, the
 *   comments/friends panels, Clerk's modal, the search results) still scrolls
 *   itself instead of the page.
 * - While it's gliding, Lenis turns off pointer events on iframes (lenis.css),
 *   so passing over a player embed doesn't swallow the wheel mid-scroll.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      autoRaf: true,
      lerp: 0.2,
      wheelMultiplier: 1,
      allowNestedScroll: true,
      anchors: true,
      stopInertiaOnNavigate: true,
    });
    registerSmoothScroll(lenis);

    return () => {
      registerSmoothScroll(null);
      lenis.destroy();
    };
  }, []);

  return null;
}
