"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useLayoutEffect, useRef } from "react";
import { Bookmark, Clapperboard, Home, ListVideo, PlusCircle, Tv } from "lucide-react";
import { useTranslation } from "@/lib/i18n/locale-context";
import type { TranslationKey } from "@/lib/i18n/dictionary";

// Exported so MobileTabBar (the floating bottom bar on phones) renders the
// exact same primary destinations instead of keeping a second list in sync.
export const NAV_LINKS = [
  { href: "/", labelKey: "nav.home", icon: Home },
  { href: "/movies", labelKey: "nav.movies", icon: Clapperboard },
  { href: "/series", labelKey: "nav.series", icon: Tv },
  { href: "/watchlist", labelKey: "nav.watchlist", icon: Bookmark },
  { href: "/playlists", labelKey: "nav.playlists", icon: ListVideo },
  { href: "/order", labelKey: "nav.order", icon: PlusCircle },
] as const satisfies { href: string; labelKey: TranslationKey; icon: unknown }[];

export function isLinkActive(pathname: string | null, href: string) {
  return href === "/" ? pathname === "/" : (pathname?.startsWith(href) ?? false);
}

/**
 * The desktop link row: one white pill that slides (with a little overshoot)
 * to the active link, plus a faint one that follows the hovered link.
 *
 * Both are positioned by writing straight to their style — measured from the
 * links' offsets — rather than through state, so moving them never re-renders
 * the row. The active pill skips its transition on the first placement, so it
 * doesn't fly in from the left edge on page load. Neither gets a `style`
 * prop (they start hidden via opacity-0), so React never resets them.
 */
export function NavLinks() {
  const pathname = usePathname();
  const { t, locale } = useTranslation();
  const rowRef = useRef<HTMLDivElement>(null);
  const activePillRef = useRef<HTMLSpanElement>(null);
  const hoverPillRef = useRef<HTMLSpanElement>(null);
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const activeIndex = NAV_LINKS.findIndex(({ href }) => isLinkActive(pathname, href));

  const placeActivePill = useCallback(() => {
    const pill = activePillRef.current;
    if (!pill) return;
    const link = activeIndex >= 0 ? linkRefs.current[activeIndex] : null;
    if (!link) {
      pill.style.opacity = "0";
      return;
    }
    pill.style.width = `${link.offsetWidth}px`;
    pill.style.transform = `translateX(${link.offsetLeft}px)`;
    pill.style.opacity = "1";
    if (!pill.dataset.ready) {
      // Let this first position paint before transitions switch on.
      requestAnimationFrame(() => {
        pill.dataset.ready = "true";
      });
    }
  }, [activeIndex]);

  useLayoutEffect(() => {
    placeActivePill();
    const row = rowRef.current;
    if (!row) return;
    // Labels change width with the language, and with the web font loading in.
    const observer = new ResizeObserver(placeActivePill);
    observer.observe(row);
    return () => observer.disconnect();
  }, [placeActivePill, locale]);

  const showHoverPill = (index: number) => {
    const pill = hoverPillRef.current;
    const link = linkRefs.current[index];
    if (!pill || !link) return;
    if (pill.style.opacity !== "1") {
      // Appear in place instead of sliding over from wherever it last was.
      pill.style.transition = "none";
      pill.style.width = `${link.offsetWidth}px`;
      pill.style.transform = `translateX(${link.offsetLeft}px)`;
      void pill.offsetWidth;
      pill.style.transition = "";
    }
    pill.style.width = `${link.offsetWidth}px`;
    pill.style.transform = `translateX(${link.offsetLeft}px)`;
    pill.style.opacity = index === activeIndex ? "0" : "1";
  };

  const hideHoverPill = () => {
    if (hoverPillRef.current) hoverPillRef.current.style.opacity = "0";
  };

  return (
    <div
      ref={rowRef}
      onMouseLeave={hideHoverPill}
      className="relative hidden items-center gap-0.5 rounded-full border border-white/[0.06] bg-white/[0.03] p-1 md:flex"
    >
      <span
        ref={hoverPillRef}
        aria-hidden
        className="pointer-events-none absolute top-1 bottom-1 left-0 rounded-full bg-white/10 opacity-0 transition-[transform,width,opacity] duration-300 ease-out"
      />
      <span
        ref={activePillRef}
        aria-hidden
        className="pointer-events-none absolute top-1 bottom-1 left-0 rounded-full bg-white opacity-0 shadow-[0_4px_18px_-4px_rgba(255,255,255,0.6)] data-[ready=true]:transition-[transform,width,opacity] data-[ready=true]:duration-500 data-[ready=true]:ease-[cubic-bezier(0.34,1.36,0.64,1)]"
      />

      {NAV_LINKS.map(({ href, labelKey, icon: Icon }, index) => {
        const isActive = index === activeIndex;
        return (
          <Link
            key={href}
            href={href}
            ref={(node) => {
              linkRefs.current[index] = node;
            }}
            onMouseEnter={() => showHoverPill(index)}
            onFocus={() => showHoverPill(index)}
            onBlur={hideHoverPill}
            aria-current={isActive ? "page" : undefined}
            className={`relative z-10 flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors duration-300 lg:px-4 ${
              isActive ? "text-neutral-900" : "text-foreground/90 hover:text-white"
            }`}
          >
            <Icon size={15} className={`transition-transform duration-300 ${isActive ? "scale-110" : ""}`} />
            {t(labelKey)}
          </Link>
        );
      })}
    </div>
  );
}
