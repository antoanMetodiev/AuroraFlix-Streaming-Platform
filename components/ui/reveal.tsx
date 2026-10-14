"use client";

import { useInViewOnce } from "@/lib/use-in-view-once";

/**
 * Wraps a section so it floats up into place the first time it scrolls into
 * view (the shared .reveal / .reveal-hidden styles in globals.css). For
 * sections that don't run their own useInViewOnce entrance already.
 */
export function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.12);
  return (
    <div ref={ref} className={`reveal ${inView ? "" : "reveal-hidden"} ${className}`}>
      {children}
    </div>
  );
}
