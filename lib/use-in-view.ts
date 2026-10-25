"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Like useInViewOnce, but keeps tracking: true while the element is on (or
 * within `rootMargin` of) the screen, false again once it scrolls away. Used
 * to pause endless CSS animations nobody can see.
 */
export function useInView<T extends HTMLElement>(rootMargin = "200px") {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin });
    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin]);

  return { ref, inView };
}
