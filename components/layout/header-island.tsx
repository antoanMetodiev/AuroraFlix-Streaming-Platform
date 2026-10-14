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
      <div className="relative mx-auto max-w-[120rem]">
        <div className="pointer-events-auto relative flex h-12 items-center gap-3 rounded-full border-[0.5px] border-white/30 bg-neutral-700/30 pr-2 pl-2.5 shadow-[0_0_20px_-2px_rgba(255,255,255,0.28)] backdrop-blur-2xl backdrop-saturate-150 transition-[background-color,box-shadow] duration-300 ease-out group-data-[scrolled=true]/header:bg-neutral-700/45 group-data-[scrolled=true]/header:shadow-[0_0_24px_-2px_rgba(255,255,255,0.36)] sm:gap-5 sm:pl-3 lg:pl-4">
          {children}
        </div>
      </div>
    </header>
  );
}
