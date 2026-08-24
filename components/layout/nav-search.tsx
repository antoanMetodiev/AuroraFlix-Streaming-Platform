"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Search, X } from "lucide-react";
import { SearchBox } from "@/components/movies/search-box";
import { useTranslation } from "@/lib/i18n/locale-context";

const TYPES = [
  { value: "movie", labelKey: "search.movies" },
  { value: "series", labelKey: "search.series" },
] as const;

export function NavSearch() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<"movie" | "series">(pathname?.startsWith("/series") ? "series" : "movie");

  // Navigation is rendered once from the root layout, so this component never
  // remounts across client-side route changes — re-derive the search type from
  // the current path whenever it changes instead of only at first mount.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setType(pathname?.startsWith("/series") ? "series" : "movie");
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label={isOpen ? t("nav.closeSearch") : t("nav.openSearch")}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-foreground/10 bg-foreground/5 text-foreground/70 backdrop-blur-xl transition-colors hover:bg-foreground/10 hover:text-foreground"
      >
        {isOpen ? <X size={18} /> : <Search size={18} />}
      </button>

      {isOpen && <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />}

      {/*
       * Anchoring this to the trigger button with `absolute right-0` broke on
       * mobile: the button sits well left of the header's true right edge (the
       * language toggle and menu button come after it), so a 90vw-wide panel
       * pinned to the button's right edge could spill off the left side of the
       * screen. Below `sm`, it's `fixed` and clamped to the viewport edges
       * instead; from `sm` up there's enough room for the original anchored popover.
       */}
      <div
        className={`fixed inset-x-3 top-[4.25rem] z-40 origin-top rounded-2xl border border-foreground/10 bg-surface p-3 shadow-[0_20px_45px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-all duration-200 ease-out sm:absolute sm:inset-x-auto sm:top-13 sm:right-0 sm:origin-top-right sm:w-96 ${
          isOpen ? "pointer-events-auto scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
        }`}
      >
        <div className="mb-3 flex gap-1 rounded-full border border-foreground/10 bg-foreground/5 p-1">
          {TYPES.map(({ value, labelKey }) => (
            <button
              key={value}
              type="button"
              onClick={() => setType(value)}
              className={`flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors duration-200 ${
                type === value ? "bg-linear-to-br from-[#4a00e0] to-[#8e2de2] text-white" : "text-foreground/60 hover:text-foreground"
              }`}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>

        <SearchBox key={type} type={type} onNavigate={() => setIsOpen(false)} />
      </div>
    </div>
  );
}
