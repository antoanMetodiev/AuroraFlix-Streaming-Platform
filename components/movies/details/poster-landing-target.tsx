"use client";

import { useEffect, useRef } from "react";
import { landPoster } from "@/lib/poster-launch";

/** The details page's poster frame — where a poster launched from a card lands (lib/poster-launch.ts). */
export function PosterLandingTarget({ className, children }: { className: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Two frames: let the page lay out (and scroll to the top) before measuring.
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => ref.current && landPoster(ref.current));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
