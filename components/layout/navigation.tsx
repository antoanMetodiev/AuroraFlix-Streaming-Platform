"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bookmark, Clapperboard, Crown, Download, Home, ListVideo, Menu, PlusCircle, Tv, X } from "lucide-react";
import { FaAndroid, FaLinkedin } from "react-icons/fa";
import { NavSearch } from "@/components/layout/nav-search";
import { LanguageToggle } from "@/components/layout/language-toggle";
import { AuthNav } from "@/components/layout/auth-nav";
import { FriendsNavButton } from "@/components/friends/friends-nav-button";
import { NotificationsBell } from "@/components/friends/notifications-bell";
import { AssistantLauncher } from "@/components/assistant/assistant-launcher";
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

// The Android app (sideloaded — not on Google Play); see mobile-front-end/.
const ANDROID_APK_URL = "/downloads/auroraflix.apk";

export function isLinkActive(pathname: string | null, href: string) {
  return href === "/" ? pathname === "/" : (pathname?.startsWith(href) ?? false);
}

// Always scrolls to the pricing cards when clicked. If we're already on the
// homepage, the URL hash alone won't change (so the browser won't scroll on
// its own) — jump there manually. Otherwise let the Link navigate normally;
// Next.js scrolls to the #pricing element once the homepage has loaded.
function handlePricingClick(pathname: string | null, event: React.MouseEvent) {
  if (pathname !== "/") return;
  event.preventDefault();
  document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function Navigation() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  return (
    // min-w-0 overrides flexbox's default min-width:auto — without it, this
    // flex-1 item refuses to shrink below its own content's natural width on
    // narrow screens, forcing the whole sticky header (and the page) wider
    // than the viewport instead of letting its children wrap/truncate.
    <nav className="relative flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
      {/* Desktop: plain row of links, left-aligned right after the logo */}
      <div className="hidden items-center gap-1 md:flex">
        {NAV_LINKS.map(({ href, labelKey, icon: Icon }) => {
          const isActive = isLinkActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 ${
                isActive
                  ? "bg-white text-neutral-900 shadow-[0_4px_16px_-4px_rgba(255,255,255,0.5)]"
                  : "text-foreground/65 hover:bg-foreground/10 hover:text-foreground"
              }`}
            >
              <Icon size={15} />
              {t(labelKey)}
            </Link>
          );
        })}

        <Link
          href="/#pricing"
          onClick={(event) => handlePricingClick(pathname, event)}
          className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-foreground/65 transition-all duration-300 hover:bg-foreground/10 hover:text-foreground"
        >
          <Crown size={15} />
          {t("nav.pricing")}
        </Link>
      </div>

      <a
        href={ANDROID_APK_URL}
        download
        aria-label={t("nav.androidDownloadAria")}
        title={t("nav.androidOnly")}
        className="group hidden items-center gap-2 rounded-full border border-[#3DDC84]/30 bg-[#3DDC84]/10 py-1.5 pr-3.5 pl-2 text-xs font-semibold whitespace-nowrap text-foreground/85 shadow-[0_0_24px_-8px_rgba(61,220,132,0.6)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#3DDC84]/60 hover:bg-[#3DDC84]/15 hover:text-foreground lg:flex"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#3DDC84] text-neutral-900">
          <FaAndroid size={14} />
        </span>
        {t("nav.androidApp")}
        <Download size={13} className="text-[#3DDC84] transition-transform duration-300 group-hover:translate-y-0.5" />
      </a>

      {/* Pushes search/language/LinkedIn/hamburger to the far right, keeping links left-aligned */}
      <div className="flex-1" />

      <span className="hidden h-5 w-px bg-foreground/15 md:block" />

      <NavSearch />

      <FriendsNavButton />
      <NotificationsBell />
      <AssistantLauncher className="hidden md:flex" />

      <LanguageToggle />

      <AuthNav className="hidden md:block" />

      <a
        href="https://www.linkedin.com/in/antoan-metodiev-875518303"
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t("nav.linkedinAria")}
        className="hidden h-10 w-10 items-center justify-center rounded-full text-foreground/65 transition-all duration-300 hover:scale-110 hover:bg-foreground/10 hover:text-foreground md:flex"
      >
        <FaLinkedin size={16} />
      </a>

      {/* Mobile: trigger + dropdown panel */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label={isOpen ? t("nav.closeMenu") : t("nav.openMenu")}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-foreground/10 bg-foreground/5 text-foreground backdrop-blur-xl transition-colors hover:bg-foreground/10 md:hidden"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {isOpen && <div className="fixed inset-0 z-30 md:hidden" onClick={() => setIsOpen(false)} />}

      {/*
       * The primary destinations (home/movies/series/watchlist/order) now
       * live in the floating MobileTabBar at the bottom of the screen, so
       * this sheet only holds the secondary stuff there's no room for down
       * there: pricing, account/language, and the LinkedIn/credit line.
       */}
      <div
        className={`absolute top-13 right-0 z-40 flex w-56 origin-top-right flex-col gap-1 rounded-2xl border border-foreground/10 bg-surface p-2 shadow-[0_20px_45px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-all duration-200 ease-out md:hidden ${
          isOpen ? "pointer-events-auto scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
        }`}
      >
        <Link
          href="/#pricing"
          onClick={(event) => {
            handlePricingClick(pathname, event);
            setIsOpen(false);
          }}
          className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-foreground/75 transition-colors hover:bg-foreground/10 hover:text-foreground"
        >
          <Crown size={17} />
          {t("nav.pricing")}
        </Link>

        <div onClick={() => setIsOpen(false)}>
          <AssistantLauncher asMenuItem className="w-full" />
        </div>

        <span className="my-1 h-px w-full bg-foreground/10" />

        <div className="flex items-center justify-between gap-2 px-2 py-1">
          <AuthNav />
          <LanguageToggle />
        </div>

        <a
          href="https://www.linkedin.com/in/antoan-metodiev-875518303"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setIsOpen(false)}
          className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-foreground/75 transition-colors hover:bg-foreground/10 hover:text-foreground"
        >
          <FaLinkedin size={17} />
          LinkedIn
        </a>

        <a
          href={ANDROID_APK_URL}
          download
          onClick={() => setIsOpen(false)}
          aria-label={t("nav.androidDownloadAria")}
          className="mx-1 mt-1 mb-1 flex items-center gap-3 rounded-xl border border-[#3DDC84]/30 bg-[#3DDC84]/10 px-3 py-2.5 transition-colors hover:border-[#3DDC84]/60 hover:bg-[#3DDC84]/15"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#3DDC84] text-neutral-900 shadow-[0_0_18px_-4px_rgba(61,220,132,0.7)]">
            <FaAndroid size={19} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-sm font-semibold text-foreground">{t("nav.androidApp")}</span>
            <span className="text-[11px] text-foreground/55">{t("nav.androidOnly")}</span>
          </span>
          <Download size={16} className="shrink-0 text-[#3DDC84]" />
        </a>
      </div>
    </nav>
  );
}
