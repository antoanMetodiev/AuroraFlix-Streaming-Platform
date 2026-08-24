"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bookmark, Clapperboard, Crown, Home, Menu, PlusCircle, Tv, X } from "lucide-react";
import { FaLinkedin } from "react-icons/fa";
import { NavSearch } from "@/components/layout/nav-search";
import { LanguageToggle } from "@/components/layout/language-toggle";
import { AuthNav } from "@/components/layout/auth-nav";
import { useTranslation } from "@/lib/i18n/locale-context";
import type { TranslationKey } from "@/lib/i18n/dictionary";

// Exported so MobileTabBar (the floating bottom bar on phones) renders the
// exact same primary destinations instead of keeping a second list in sync.
export const NAV_LINKS = [
  { href: "/", labelKey: "nav.home", icon: Home },
  { href: "/movies", labelKey: "nav.movies", icon: Clapperboard },
  { href: "/series", labelKey: "nav.series", icon: Tv },
  { href: "/watchlist", labelKey: "nav.watchlist", icon: Bookmark },
  { href: "/order", labelKey: "nav.order", icon: PlusCircle },
] as const satisfies { href: string; labelKey: TranslationKey; icon: unknown }[];

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
    <nav className="relative flex flex-1 items-center gap-2 sm:gap-3">
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
                  ? "bg-linear-to-br from-[#4a00e0] to-[#8e2de2] text-white shadow-[0_4px_16px_-4px_rgba(142,45,226,0.7)]"
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

      <span className="hidden items-center gap-1 pl-1 text-xs whitespace-nowrap text-foreground/40 lg:flex">
        {t("nav.madeBy")}
        <a
          href="https://www.linkedin.com/in/antoan-metodiev-875518303"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-foreground/60 underline-offset-2 transition-colors hover:text-foreground hover:underline"
        >
          Antoan Metodiev
        </a>
      </span>

      {/* Pushes search/language/LinkedIn/hamburger to the far right, keeping links left-aligned */}
      <div className="flex-1" />

      <span className="hidden h-5 w-px bg-foreground/15 md:block" />

      <NavSearch />

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

        <span className="flex items-center gap-1 px-4 pb-1 text-xs text-foreground/40">
          {t("nav.madeBy")}
          <a
            href="https://www.linkedin.com/in/antoan-metodiev-875518303"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setIsOpen(false)}
            className="font-medium text-foreground/70 underline-offset-2 hover:text-foreground hover:underline"
          >
            Antoan Metodiev
          </a>
        </span>
      </div>
    </nav>
  );
}
