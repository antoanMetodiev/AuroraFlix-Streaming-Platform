"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "@/lib/i18n/locale-context";

export function CarouselArrowButton({
  direction,
  onClick,
  className = "",
}: {
  direction: "left" | "right";
  onClick: () => void;
  className?: string;
}) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === "left" ? t("carousel.scrollLeft") : t("carousel.scrollRight")}
      className={`absolute top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.35)] transition-transform duration-200 hover:scale-110 sm:h-11 sm:w-11 ${
        direction === "left" ? "left-1" : "right-1"
      } ${className}`}
    >
      {direction === "left" ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
    </button>
  );
}
