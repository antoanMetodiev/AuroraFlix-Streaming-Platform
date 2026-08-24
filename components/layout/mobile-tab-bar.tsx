"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_LINKS, isLinkActive } from "@/components/layout/navigation";
import { useTranslation } from "@/lib/i18n/locale-context";

// Floating thumb-reach tab bar for phones, mirroring the native-app pattern
// (Netflix/Spotify) instead of forcing every navigation through a dropdown.
// Desktop keeps the classic top bar in Navigation; this only renders below `md`.
export function MobileTabBar() {
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-between gap-0.5 rounded-3xl border border-foreground/10 bg-surface/90 px-1.5 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] shadow-[0_20px_45px_-8px_rgba(0,0,0,0.55)] backdrop-blur-xl md:hidden"
    >
      {NAV_LINKS.map(({ href, labelKey, icon: Icon }) => {
        const isActive = isLinkActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className="flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-2xl py-1.5 transition-transform duration-200 active:scale-95"
          >
            <span
              className={`flex h-8 w-9 items-center justify-center rounded-full transition-all duration-300 ${
                isActive
                  ? "bg-linear-to-br from-[#4a00e0] to-[#8e2de2] text-white shadow-[0_4px_14px_-3px_rgba(142,45,226,0.85)]"
                  : "text-foreground/50"
              }`}
            >
              <Icon size={17} />
            </span>
            <span
              className={`max-w-full truncate px-0.5 text-[10px] font-semibold transition-colors duration-300 ${
                isActive ? "text-foreground" : "text-foreground/45"
              }`}
            >
              {labelKey === "nav.watchlist" ? t("nav.watchlistShort") : t(labelKey)}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
