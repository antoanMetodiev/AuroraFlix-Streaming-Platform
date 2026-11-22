"use client";

import { useEffect, useRef } from "react";

/**
 * A clipped layer whose content drifts slower than the page while it's near
 * the top of the screen — the backdrop sinks a little as you scroll, giving
 * the banner depth. Pure transform on one element, written in rAF, only while
 * the layer is at least partly in view; nothing with reduced motion.
 */
export function Parallax({
  children,
  className = "",
  speed = 0.3,
}: {
  children: React.ReactNode;
  className?: string;
  /** Share of the scroll distance the content moves along with (0 = static, 1 = fixed). */
  speed?: number;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = outer.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      // How far the layer's top has scrolled above its starting point.
      const scrolled = Math.max(0, -rect.top);
      inner.style.transform = `translate3d(0, ${scrolled * speed}px, 0) scale(${1 + Math.min(scrolled / rect.height, 1) * 0.06})`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [speed]);

  return (
    <div ref={outerRef} className={`overflow-hidden ${className}`}>
      <div ref={innerRef} className="absolute inset-0 origin-top will-change-transform">
        {children}
      </div>
    </div>
  );
}
