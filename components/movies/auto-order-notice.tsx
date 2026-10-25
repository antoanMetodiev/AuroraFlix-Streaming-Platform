"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RotateCw, SearchX } from "lucide-react";
import { Spinner } from "@/components/ui/loader";
import { orderMovie, orderSeries } from "@/lib/api-public";
import { markCatalogFresh } from "@/lib/fresh-catalog";
import { useTranslation } from "@/lib/i18n/locale-context";

/** Searches already ordered this session, so a reload doesn't order them again. */
const ORDERED_KEY = "aurora_auto_ordered";

/** When the page looks again by itself after the order went out. */
const RECHECK_AFTER_MS = [6_000, 15_000];

function wasOrdered(key: string): boolean {
  try {
    return (JSON.parse(window.sessionStorage.getItem(ORDERED_KEY) ?? "[]") as string[]).includes(key);
  } catch {
    return false;
  }
}

function rememberOrdered(key: string) {
  try {
    const keys = JSON.parse(window.sessionStorage.getItem(ORDERED_KEY) ?? "[]") as string[];
    window.sessionStorage.setItem(ORDERED_KEY, JSON.stringify([...keys, key]));
  } catch {
    // Blocked storage — at worst a reload orders the same title once more.
  }
}

/**
 * Shown instead of the empty grid when a title search finds nothing: the
 * search text is sent off as an order (same request as the Order page), so
 * the generator adds the title, and the page re-checks by itself a couple of
 * times — the search endpoint isn't cached, so it shows up as soon as it's in.
 */
export function AutoOrderNotice({ type, query }: { type: "movie" | "series"; query: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [status, setStatus] = useState<"sending" | "sent" | "error">("sending");
  const startedRef = useRef(false);

  useEffect(() => {
    // Strict Mode runs effects twice in dev — one order per search, still.
    if (startedRef.current) return;
    startedRef.current = true;

    const key = `${type}:${query.trim().toLowerCase()}`;
    if (wasOrdered(key)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reads sessionStorage, which only exists after mount
      setStatus("sent");
      return;
    }

    (type === "movie" ? orderMovie(query) : orderSeries(query))
      .catch(() => false)
      .then((ok) => {
        if (!ok) {
          setStatus("error");
          return;
        }
        rememberOrdered(key);
        // Lets the listings skip their cache too, so it shows there as well.
        markCatalogFresh();
        setStatus("sent");
      });
  }, [type, query]);

  // Once it's ordered, look again by itself — when the title is in, the
  // page re-renders with results and this notice unmounts.
  useEffect(() => {
    if (status !== "sent") return;
    const timers = RECHECK_AFTER_MS.map((delay) => window.setTimeout(() => router.refresh(), delay));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [status, router]);

  return (
    <div className="relative mx-auto flex min-h-[24em] max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-foreground/5 text-foreground/50 ring-1 ring-white/10">
        <SearchX size={24} />
      </span>
      <h3 className="font-display text-2xl leading-tight font-semibold tracking-tight text-balance break-words text-foreground sm:text-3xl">
        {t("search.autoOrderTitle", { query })}
      </h3>

      {status === "sending" && (
        <p className="flex items-center gap-2 text-sm text-foreground/60">
          <Spinner size={14} />
          {t("search.autoOrderSending")}
        </p>
      )}

      {status === "sent" && (
        <>
          <p className="text-sm leading-relaxed text-foreground/60">{t("search.autoOrderSent")}</p>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="mt-2 flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-neutral-900 shadow-[0_8px_20px_-4px_rgba(255,255,255,0.4)] transition-transform duration-200 hover:-translate-y-0.5"
          >
            <RotateCw size={15} />
            {t("search.checkAgain")}
          </button>
        </>
      )}

      {status === "error" && (
        <>
          <p className="text-sm leading-relaxed text-foreground/60">{t("search.autoOrderFailed")}</p>
          <Link
            href={`/order/${type}`}
            className="mt-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-neutral-900 shadow-[0_8px_20px_-4px_rgba(255,255,255,0.4)] transition-transform duration-200 hover:-translate-y-0.5"
          >
            {t("search.orderManually")}
          </Link>
        </>
      )}
    </div>
  );
}
