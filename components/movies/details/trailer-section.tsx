"use client";

import { SectionHeading } from "@/components/movies/details/section-heading";
import { useTranslation } from "@/lib/i18n/locale-context";

export function TrailerSection({ trailerURL }: { trailerURL: string }) {
  const { t } = useTranslation();
  const embedUrl = trailerURL.replace("https://www.youtube.com/watch?v=", "https://www.youtube.com/embed/");

  return (
    <section className="mx-auto my-16 max-w-[90rem] px-4 sm:my-24 sm:px-6">
      <SectionHeading>{t("sections.trailer")}</SectionHeading>

      <div className="relative aspect-video w-full max-w-[70rem] overflow-hidden rounded-2xl bg-[#050505] shadow-[0_20px_60px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.06)] transition-transform duration-400 hover:-translate-y-1">
        <iframe
          className="absolute inset-0 h-full w-full border-0"
          src={embedUrl}
          title={t("sections.trailer")}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    </section>
  );
}
