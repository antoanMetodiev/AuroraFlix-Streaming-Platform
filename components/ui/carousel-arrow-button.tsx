"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "@/lib/i18n/locale-context";

export function CarouselArrowButton({
  direction,
  onClick,
  className = "",
  inline = false,
  disabled = false,
}: {
  direction: "left" | "right";
  onClick: () => void;
  className?: string;
  /** Sits in the layout (e.g. next to a heading) instead of over the track. */
  inline?: boolean;
  disabled?: boolean;
}) {
  const { t } = useTranslation();

  const position = inline
    ? "h-9 w-9 disabled:pointer-events-none disabled:opacity-30 sm:h-10 sm:w-10"
    : `absolute top-1/2 z-10 h-10 w-10 -translate-y-1/2 sm:h-11 sm:w-11 ${direction === "left" ? "left-1" : "right-1"}`;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "left" ? t("carousel.scrollLeft") : t("carousel.scrollRight")}
      className={`flex items-center justify-center rounded-full bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.35)] transition-[transform,opacity] duration-200 hover:scale-110 ${position} ${className}`}
    >
      {direction === "left" ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
    </button>
  );
}
