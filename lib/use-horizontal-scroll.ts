"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Shared drag-to-scroll + edge-detection behavior for the horizontal
 * carousels (genres, cast, latest-works/last-viewed).
 */
export function useHorizontalScroll<T extends HTMLElement>(deps: unknown[] = []) {
  const containerRef = useRef<T | null>(null);
  const isDownRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateScrollState = () => {
      setCanScrollLeft(container.scrollLeft > 0);
      setCanScrollRight(container.scrollLeft + container.clientWidth < container.scrollWidth - 1);
    };

    updateScrollState();
    container.addEventListener("scroll", updateScrollState);
    window.addEventListener("resize", updateScrollState);
    return () => {
      container.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const scrollBy = (distance: number) => containerRef.current?.scrollBy({ left: distance, behavior: "smooth" });

  const onPointerDown = (clientX: number) => {
    const container = containerRef.current;
    if (!container) return;
    isDownRef.current = true;
    startXRef.current = clientX - container.offsetLeft;
    scrollLeftRef.current = container.scrollLeft;
  };

  const onPointerMove = (clientX: number) => {
    const container = containerRef.current;
    if (!isDownRef.current || !container) return;
    const x = clientX - container.offsetLeft;
    container.scrollLeft = scrollLeftRef.current - (x - startXRef.current);
  };

  const onPointerUp = () => {
    isDownRef.current = false;
  };

  const dragHandlers = {
    onMouseDown: (event: React.MouseEvent) => onPointerDown(event.pageX),
    onMouseMove: (event: React.MouseEvent) => onPointerMove(event.pageX),
    onMouseUp: onPointerUp,
    onMouseLeave: onPointerUp,
    onTouchStart: (event: React.TouchEvent) => onPointerDown(event.touches[0].pageX),
    onTouchMove: (event: React.TouchEvent) => onPointerMove(event.touches[0].pageX),
    onTouchEnd: onPointerUp,
  };

  return { containerRef, canScrollLeft, canScrollRight, scrollBy, dragHandlers };
}
