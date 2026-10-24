"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n/locale-context";
import { slowScrollTo } from "@/lib/smooth-scroll";
import type { TranslationKey } from "@/lib/i18n/dictionary";

type Stop = { id: string; label: TranslationKey };

// A section counts as "current" once its top passes this share of the viewport.
const ACTIVE_LINE = 0.35;

/**
 * Side rail on the details page (desktop only): one dot per <NavSection>,
 * the current one lit up. Sections stream in late (facts, similar titles) or
 * render nothing at all, so the list is re-read whenever the page changes.
 */
export function SectionNav() {
  const { t } = useTranslation();
  const [stops, setStops] = useState<Stop[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const readStops = () => {
      const next = Array.from(document.querySelectorAll<HTMLElement>("[data-nav-section]"))
        .filter((el) => el.offsetHeight > 0)
        .map((el) => ({ id: el.id, label: el.dataset.navSection as TranslationKey }));
      setStops((prev) =>
        prev.length === next.length && prev.every((stop, i) => stop.id === next[i].id) ? prev : next
      );
    };

    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const line = window.innerHeight * ACTIVE_LINE;
        let current: string | null = null;
        for (const el of document.querySelectorAll<HTMLElement>("[data-nav-section]")) {
          if (el.offsetHeight > 0 && el.getBoundingClientRect().top <= line) current = el.id;
        }
        // At the very bottom the last short sections can never reach the line.
        const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
        if (atBottom) {
          const all = document.querySelectorAll<HTMLElement>("[data-nav-section]");
          const last = Array.from(all).reverse().find((el) => el.offsetHeight > 0);
          if (last) current = last.id;
        }
        setActiveId(current);
        setVisible(window.scrollY > window.innerHeight * 0.3);
      });
    };

    readStops();
    update();

    const observer = new MutationObserver(() => {
      readStops();
      update();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  if (stops.length < 2) return null;

  const activeIndex = Math.max(0, stops.findIndex((stop) => stop.id === activeId));

  return (
    <nav
      aria-label={t("sections.navLabel")}
      className={`group/nav fixed top-1/2 right-5 z-30 hidden -translate-y-1/2 transition-all duration-500 xl:block ${
        visible ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-4 opacity-0"
      }`}
    >
      <ol className="relative flex flex-col gap-1 rounded-2xl py-2 pr-2 pl-3 transition-colors duration-300 group-hover/nav:bg-black/45 group-hover/nav:backdrop-blur-md">
        {/* Track + progress line behind the dots. */}
        <span aria-hidden className="absolute top-6 right-4 bottom-6 w-px bg-white/12" />
        <span
          aria-hidden
          className="absolute top-6 right-4 w-px bg-white/70 shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-[height] duration-500"
          style={{ height: `calc((100% - 3rem) * ${stops.length > 1 ? activeIndex / (stops.length - 1) : 0})` }}
        />

        {stops.map((stop) => {
          const active = stop.id === activeId;
          return (
            <li key={stop.id}>
              <a
                href={`#${stop.id}`}
                aria-current={active ? "true" : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  const target = document.getElementById(stop.id);
                  if (target) slowScrollTo(target);
                }}
                className="flex h-8 items-center justify-end gap-3"
              >
                <span
                  className={`rounded-full px-2.5 py-0.5 text-sm whitespace-nowrap transition-all duration-300 ${
                    active
                      ? // The rail floats over full-width carousels, so the current label gets its own glass pill.
                        "bg-black/55 font-medium text-foreground opacity-100 ring-1 ring-white/10 backdrop-blur-md group-hover/nav:bg-white/10"
                      : "text-foreground/60 opacity-0 group-hover/nav:opacity-100 hover:text-foreground"
                  }`}
                >
                  {t(stop.label)}
                </span>
                <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
                  <span
                    className={`rounded-full transition-all duration-300 ${
                      active
                        ? "h-2.5 w-2.5 bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)]"
                        : "h-1.5 w-1.5 bg-white/40"
                    }`}
                  />
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
