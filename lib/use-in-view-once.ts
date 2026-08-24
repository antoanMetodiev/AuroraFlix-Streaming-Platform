"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Minimal native-IntersectionObserver replacement for the "fade in on scroll"
 * pattern used across the detail-page sections — avoids pulling in a library
 * for something this small.
 */
export function useInViewOnce<T extends HTMLElement>(threshold = 0.2) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || inView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [inView, threshold]);

  return { ref, inView };
}
