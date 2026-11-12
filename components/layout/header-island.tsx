"use client";

import { useEffect, useState } from "react";

/**
 * The floating glass "island" the header lives in. Client-only for the scroll
 * state: past the very top it turns more opaque so it reads over busy
 * posters. Its height is fixed at the slim h-12; with the outer padding it
 * stays inside the 4rem the body's pt-16 (and every calc(100vh-4rem)) reserves.
 */
export function HeaderIsland({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      data-site-chrome
      data-scrolled={scrolled}
      className="group/header pointer-events-none fixed inset-x-0 top-0 z-40 w-full px-2 pt-2 sm:px-4 lg:px-6"
    >
      {/* The island hugs its content (w-fit) and sits centred, rather than
          stretching edge to edge. */}
      <div className="flex justify-center">
        <div className="pointer-events-auto relative flex h-12 w-fit max-w-full items-center gap-3 rounded-full border border-white/15 bg-black/35 pr-2 pl-2.5 shadow-[0_18px_50px_-18px_rgba(0,0,0,0.9),0_0_22px_-6px_rgba(255,255,255,0.18)] backdrop-blur-2xl backdrop-saturate-150 transition-[background-color,border-color,box-shadow] duration-500 ease-out group-data-[scrolled=true]/header:border-white/20 group-data-[scrolled=true]/header:bg-black/60 group-data-[scrolled=true]/header:shadow-[0_22px_60px_-18px_rgba(0,0,0,0.95),0_0_28px_-6px_rgba(255,255,255,0.26)] sm:gap-5 sm:pl-3 lg:pl-4">
          {/* Light catching the glass from above, and a thin glow line along
              the bottom edge that brightens once the page scrolls under it.
              Decorative only — clipped to the pill, never takes clicks. */}
          <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
            <span className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/[0.09] to-transparent" />
            <span className="absolute inset-x-10 bottom-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent opacity-60 transition-opacity duration-500 group-data-[scrolled=true]/header:opacity-100" />
          </span>
          {children}
        </div>
      </div>
    </header>
  );
}
