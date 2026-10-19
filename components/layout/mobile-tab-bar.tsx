"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_LINKS, isLinkActive } from "@/components/layout/nav-links";
import { useTranslation } from "@/lib/i18n/locale-context";

// Floating thumb-reach tab bar for phones, mirroring the native-app pattern
// (Netflix/Spotify) instead of forcing every navigation through a dropdown.
// Desktop keeps the classic top bar in Navigation; this only renders below `md`.
//
// Same glass island as the header. The tabs are equal-width, so the white
// active pill is one element slid along by plain CSS (index × its own width)
// — no measuring needed.
export function MobileTabBar() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const activeIndex = NAV_LINKS.findIndex(({ href }) => isLinkActive(pathname, href));

  return (
    <nav
      aria-label="Primary"
      data-site-chrome
      className="fixed inset-x-3 bottom-3 z-40 rounded-[1.75rem] border-[0.5px] border-white/30 bg-neutral-700/45 px-1.5 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] shadow-[0_0_20px_-2px_rgba(255,255,255,0.28)] backdrop-blur-2xl backdrop-saturate-150 md:hidden"
    >
      <div className="relative flex items-center justify-between">
        <span
          aria-hidden
          style={{ width: `${100 / NAV_LINKS.length}%`, transform: `translateX(${Math.max(activeIndex, 0) * 100}%)` }}
          className={`pointer-events-none absolute top-1.5 left-0 flex h-8 justify-center transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.34,1.36,0.64,1)] ${
            activeIndex >= 0 ? "opacity-100" : "opacity-0"
          }`}
        >
          <span className="h-8 w-11 rounded-full bg-white shadow-[0_4px_16px_-3px_rgba(255,255,255,0.6)]" />
        </span>

        {NAV_LINKS.map(({ href, labelKey, icon: Icon }, index) => {
          const isActive = index === activeIndex;
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className="relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-2xl py-1.5 transition-transform duration-200 active:scale-95"
            >
              <span
                className={`flex h-8 w-11 items-center justify-center transition-colors duration-300 ${
                  isActive ? "text-neutral-900" : "text-foreground/85"
                }`}
              >
                <Icon size={17} />
              </span>
              <span
                className={`max-w-full truncate px-0.5 text-[0.625rem] font-semibold transition-colors duration-300 ${
                  isActive ? "text-white" : "text-foreground/80"
                }`}
              >
                {labelKey === "nav.watchlist" ? t("nav.watchlistShort") : labelKey === "nav.playlists" ? t("nav.playlistsShort") : t(labelKey)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
