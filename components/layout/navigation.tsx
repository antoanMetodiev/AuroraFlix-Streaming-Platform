"use client";

// PAYMENTS DISABLED: Link + usePathname (the Pricing links and their
// handlePricingClick) are back with them.
import { useEffect, useState } from "react";
// PAYMENTS DISABLED: Crown (the Pricing links' icon) is back with them.
import { /* Crown, */ Download, Menu, X } from "lucide-react";
// IOS DISABLED: FaApple (the iPhone icon) is back with it.
import { FaAndroid, /* FaApple, */ FaLinkedin } from "react-icons/fa";
import { NavLinks } from "@/components/layout/nav-links";
import { NavSearch } from "@/components/layout/nav-search";
import { LanguageToggle } from "@/components/layout/language-toggle";
import { AuthNav } from "@/components/layout/auth-nav";
import { FriendsNavButton } from "@/components/friends/friends-nav-button";
import { NotificationsBell } from "@/components/friends/notifications-bell";
// ASSISTANT DISABLED: import { AssistantLauncher } from "@/components/assistant/assistant-launcher";
import { AndroidInstallDialog } from "@/components/layout/android-install-dialog";
import { useTranslation } from "@/lib/i18n/locale-context";

// The Android app (sideloaded — not on Google Play); see mobile-front-end/.
const ANDROID_APK_URL = "/downloads/auroraflix.apk";

// PAYMENTS DISABLED — nobody is charged for now, so the Pricing links are
// hidden. Uncomment this and the two links below to bring them back.
//
// // Always scrolls to the pricing cards when clicked. If we're already on the
// // homepage, the URL hash alone won't change (so the browser won't scroll on
// // its own) — jump there manually. Otherwise let the Link navigate normally;
// // Next.js scrolls to the #pricing element once the homepage has loaded.
// function handlePricingClick(pathname: string | null, event: React.MouseEvent) {
//   if (pathname !== "/") return;
//   event.preventDefault();
//   document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth", block: "start" });
// }

export function Navigation() {
  // PAYMENTS DISABLED: const pathname = usePathname();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  // The APK download also opens install steps (Play Protect warning help).
  const [installHelpOpen, setInstallHelpOpen] = useState(false);
  // IOS DISABLED: the iPhone icon's "coming soon" hint.
  // const [iosHintOpen, setIosHintOpen] = useState(false);
  //
  // useEffect(() => {
  //   if (!iosHintOpen) return;
  //   const timer = setTimeout(() => setIosHintOpen(false), 2500);
  //   return () => clearTimeout(timer);
  // }, [iosHintOpen]);

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
    // item refuses to shrink below its own content's natural width on narrow
    // screens, forcing the whole header (and the page) wider than the
    // viewport instead of letting its children wrap/truncate. No flex-1: the
    // header island is only as wide as its content (see header-island.tsx).
    <nav className="relative flex min-w-0 items-center gap-2 sm:gap-3">
      {/* The app download icons, right after the logo (hidden on tablet widths, where the links need the room). */}
      <div className="flex shrink-0 items-center gap-1.5 md:hidden lg:flex">
        <a
          href={ANDROID_APK_URL}
          download
          aria-label={t("nav.androidDownloadAria")}
          title={t("nav.androidOnly")}
          onClick={() => setInstallHelpOpen(true)}
          className="group relative flex h-9 w-9 items-center justify-center rounded-full border border-[#3DDC84]/35 bg-[#3DDC84]/10 text-[#3DDC84] shadow-[0_0_18px_-6px_rgba(61,220,132,0.7)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#3DDC84]/70 hover:bg-[#3DDC84] hover:text-neutral-900 active:bg-[#3DDC84] active:text-neutral-900"
        >
          <FaAndroid size={17} />
          <span className="absolute -right-1 -bottom-1 flex h-4 w-4 items-center justify-center rounded-full border border-background bg-[#3DDC84] text-neutral-900">
            <Download size={9} strokeWidth={3} className="transition-transform duration-300 group-hover:translate-y-px" />
          </span>
        </a>

        {/* IOS DISABLED — hidden until there's a way to ship the iPhone app
            (Apple allows no website installs). Uncomment this, the state +
            effect above and the FaApple import to bring it back.

        No iPhone build yet — a tap just says it's coming.
        <div className="relative">
          <button
            type="button"
            onClick={() => setIosHintOpen((prev) => !prev)}
            aria-label={t("nav.iosSoon")}
            aria-expanded={iosHintOpen}
            title={t("nav.iosSoon")}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-foreground/15 bg-foreground/5 text-foreground/80 transition-all duration-300 hover:-translate-y-0.5 hover:bg-foreground/10 hover:text-foreground active:bg-foreground/15"
          >
            <FaApple size={17} />
          </button>
          <span
            role="status"
            className={`pointer-events-none absolute top-11 left-0 z-40 rounded-xl border border-foreground/10 bg-surface px-3 py-2 text-xs font-semibold whitespace-nowrap text-foreground/80 shadow-[0_12px_30px_rgba(0,0,0,0.35)] transition-all duration-200 ${
              iosHintOpen ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
            }`}
          >
            {iosHintOpen ? t("nav.iosSoon") : ""}
          </span>
        </div>
        */}
      </div>

      <span className="hidden h-5 w-px bg-white/10 lg:block" />

      {/* Desktop: the link row with the sliding active pill, right after the logo */}
      <NavLinks />

      {/* PAYMENTS DISABLED
      <Link
        href="/#pricing"
        onClick={(event) => handlePricingClick(pathname, event)}
        className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-foreground/65 transition-all duration-300 hover:bg-foreground/10 hover:text-foreground"
      >
        <Crown size={15} />
        {t("nav.pricing")}
      </Link>
      */}

      <span className="hidden h-5 w-px bg-white/10 md:block" />

      <NavSearch />

      <FriendsNavButton />
      <NotificationsBell />
      {/* ASSISTANT DISABLED — off for now, in the app too.
      <AssistantLauncher className="hidden md:flex" />
      */}

      {/* On phones the language toggle lives in the menu, next to the account. */}
      <div className="hidden md:block">
        <LanguageToggle />
      </div>

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
        {/* PAYMENTS DISABLED
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
        */}

        {/* ASSISTANT DISABLED
        <div onClick={() => setIsOpen(false)}>
          <AssistantLauncher asMenuItem className="w-full" />
        </div>

        <span className="my-1 h-px w-full bg-foreground/10" />
        */}

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
          onClick={() => {
            setIsOpen(false);
            setInstallHelpOpen(true);
          }}
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

      {installHelpOpen && <AndroidInstallDialog apkUrl={ANDROID_APK_URL} onClose={() => setInstallHelpOpen(false)} />}
    </nav>
  );
}
