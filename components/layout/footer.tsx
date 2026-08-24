"use client";

import { FaFacebook, FaInstagram, FaTwitter, FaYoutube } from "react-icons/fa";
import { useTranslation } from "@/lib/i18n/locale-context";
import type { TranslationKey } from "@/lib/i18n/dictionary";

const FOOTER_COLUMNS = [
  { titleKey: "footer.browse", itemKeys: ["footer.movies", "footer.series", "footer.genres", "footer.newReleases"] },
  { titleKey: "footer.company", itemKeys: ["footer.about", "footer.careers", "footer.press", "footer.partners"] },
  { titleKey: "footer.community", itemKeys: ["footer.blog", "footer.support", "footer.watchlist", "footer.orderTitle"] },
  { titleKey: "footer.legal", itemKeys: ["footer.privacy", "footer.terms", "footer.cookies", "footer.contact"] },
] as const satisfies { titleKey: TranslationKey; itemKeys: TranslationKey[] }[];

const SOCIAL_ICONS = [
  { Icon: FaFacebook, label: "Facebook" },
  { Icon: FaInstagram, label: "Instagram" },
  { Icon: FaTwitter, label: "Twitter" },
  { Icon: FaYoutube, label: "YouTube" },
];

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="relative z-10 bg-background px-6 py-16 text-foreground/50 sm:px-10 lg:px-16">
      <div className="mx-auto flex max-w-7xl flex-col gap-12 lg:flex-row lg:justify-between">
        <div className="flex max-w-sm flex-col gap-4">
          <h2 className="text-lg font-medium tracking-widest text-foreground/85 uppercase">
            AuroraFlix
          </h2>
          <p className="text-sm leading-relaxed text-foreground/70">
            © {new Date().getFullYear()} AuroraFlix. {t("footer.rights")}
          </p>

          <p className="text-sm text-foreground/50">
            {t("footer.tagline")}{" "}
            <a
              href="https://www.linkedin.com/in/antoan-metodiev-875518303"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground/80 underline decoration-foreground/25 underline-offset-4 transition-colors duration-300 hover:text-foreground hover:decoration-foreground/70"
            >
              Antoan Metodiev
            </a>
          </p>
          <ul className="flex gap-3">
            {SOCIAL_ICONS.map(({ Icon, label }) => (
              <li key={label}>
                <a
                  href="#"
                  aria-label={label}
                  className="flex text-foreground/50 transition-all duration-300 hover:scale-110 hover:text-foreground"
                >
                  <Icon size={26} />
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:gap-12">
          {FOOTER_COLUMNS.map((column) => (
            <ul key={column.titleKey} className="flex flex-col gap-2">
              <li className="mb-1 text-sm font-semibold text-foreground/85">
                {t(column.titleKey)}
              </li>
              {column.itemKeys.map((itemKey) => (
                <li key={itemKey} className="cursor-pointer text-sm transition-colors hover:text-foreground">
                  {t(itemKey)}
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </footer>
  );
}
