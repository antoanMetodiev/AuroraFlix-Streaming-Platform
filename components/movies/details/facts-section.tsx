import { Clapperboard, Globe, Languages, TrendingUp, Tv, Wallet, type LucideIcon } from "lucide-react";
import { FaFacebook, FaImdb, FaInstagram, FaTiktok, FaXTwitter, FaYoutube } from "react-icons/fa6";
import { SectionHeading } from "@/components/movies/details/section-heading";
import { FadeInImage } from "@/components/ui/fade-in-image";
import { getRecordFacts } from "@/lib/api";
import { getRequestLocale } from "@/lib/i18n/request-locale";
import { translate } from "@/lib/i18n/translate";
import { tmdbImage } from "@/lib/tmdb";
import type { Locale, TranslationKey } from "@/lib/i18n/dictionary";
import type { RecordFacts } from "@/types/facts";

function languageName(code: string, locale: Locale) {
  try {
    const name = new Intl.DisplayNames([locale], { type: "language" }).of(code);
    return name ? name.charAt(0).toLocaleUpperCase(locale) + name.slice(1) : code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function jobLabel(job: string, locale: Locale) {
  try {
    return translate(`facts.job.${job}` as TranslationKey, locale) ?? job;
  } catch {
    return job;
  }
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

type Page = { href: string; label: string; Icon: React.ComponentType<{ size?: number }> };

function officialPages(facts: RecordFacts, locale: Locale): Page[] {
  const pages: (Page | null)[] = [
    facts.homepage ? { href: facts.homepage, label: translate("facts.homepage", locale), Icon: Globe } : null,
    facts.imdbId ? { href: `https://www.imdb.com/title/${facts.imdbId}/`, label: "IMDb", Icon: FaImdb } : null,
    facts.facebookId ? { href: `https://www.facebook.com/${facts.facebookId}`, label: "Facebook", Icon: FaFacebook } : null,
    facts.instagramId ? { href: `https://www.instagram.com/${facts.instagramId}/`, label: "Instagram", Icon: FaInstagram } : null,
    facts.twitterId ? { href: `https://x.com/${facts.twitterId}`, label: "X", Icon: FaXTwitter } : null,
    facts.tiktokId ? { href: `https://www.tiktok.com/@${facts.tiktokId}`, label: "TikTok", Icon: FaTiktok } : null,
    facts.youtubeId
      ? { href: `https://www.youtube.com/${facts.youtubeId.startsWith("@") ? facts.youtubeId : `@${facts.youtubeId}`}`, label: "YouTube", Icon: FaYoutube }
      : null,
  ];
  return pages.filter((page): page is Page => page !== null);
}

/**
 * The details page's "Information" section — TMDB's Facts sidebar, as its own
 * section under the overview: the people behind the title (director /
 * writers, a series' creators) with their photos, the key numbers as tiles
 * (original title and language, budget and revenue, network), and the
 * official / social pages. Filled by tools/translations-backfill and, for new
 * titles, the services' internal/enrich. Renders nothing until a title has
 * facts.
 */
export async function FactsSection({ type, tmdbId }: { type: "movie" | "series"; tmdbId?: string | null }) {
  const [facts, locale] = await Promise.all([getRecordFacts(type, tmdbId), getRequestLocale()]);
  if (!facts) return null;

  const t = (key: TranslationKey) => translate(key, locale);
  const tiles = [
    facts.originalTitle ? { Icon: Clapperboard, label: t("facts.originalTitle"), value: facts.originalTitle } : null,
    facts.originalLanguage ? { Icon: Languages, label: t("facts.originalLanguage"), value: languageName(facts.originalLanguage, locale) } : null,
    facts.budget ? { Icon: Wallet, label: t("facts.budget"), value: usd.format(facts.budget) } : null,
    facts.revenue ? { Icon: TrendingUp, label: t("facts.revenue"), value: usd.format(facts.revenue) } : null,
    facts.networks?.length ? { Icon: Tv, label: t("facts.networks"), value: facts.networks.join(", ") } : null,
  ].filter((tile): tile is { Icon: LucideIcon; label: string; value: string } => tile !== null);
  const crew = facts.crew ?? [];
  const pages = officialPages(facts, locale);
  if (tiles.length === 0 && crew.length === 0 && pages.length === 0) return null;

  return (
    <section className="mx-auto max-w-[100rem] px-4 pb-14 sm:px-6 sm:pb-20 lg:px-8">
      <SectionHeading>{t("facts.title")}</SectionHeading>

      <div className={`grid gap-4 ${crew.length > 0 && tiles.length > 0 ? "lg:grid-cols-5" : ""}`}>
        {crew.length > 0 && (
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-transparent p-5 sm:p-6 lg:col-span-2">
            <p className="text-[11px] font-bold tracking-[0.2em] text-foreground/45 uppercase">{t("facts.crew")}</p>
            <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {crew.map((member) => {
                const photo = tmdbImage(member.profilePath, "w300");
                return (
                  <li key={member.id} className="flex items-center gap-4">
                    <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-white/25 to-white/5 text-sm font-bold text-white ring-2 ring-white/15">
                      {photo ? <FadeInImage src={photo} alt={member.name} sizes="56px" className="object-cover" /> : initials(member.name)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-base font-semibold text-foreground">{member.name}</span>
                      <span className="mt-1.5 flex flex-wrap gap-1.5">
                        {member.jobs.map((job) => (
                          <span key={job} className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-foreground/75">
                            {jobLabel(job, locale)}
                          </span>
                        ))}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {tiles.length > 0 && (
          <div
            className={`grid grid-cols-2 gap-4 ${crew.length > 0 ? "lg:col-span-3" : "sm:grid-cols-3 lg:grid-cols-5"} ${
              crew.length > 0 && tiles.length > 2 ? "content-start" : ""
            }`}
          >
            {tiles.map(({ Icon, label, value }) => (
              <div
                key={label}
                className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-5 transition-colors duration-300 hover:border-white/20 hover:bg-white/[0.07]"
              >
                <Icon aria-hidden className="pointer-events-none absolute -right-4 -bottom-4 h-24 w-24 text-white/[0.05] transition-transform duration-500 group-hover:scale-110" />
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-neutral-900 shadow-[0_6px_20px_-6px_rgba(255,255,255,0.5)]">
                  <Icon size={18} />
                </span>
                <p className="mt-4 text-[11px] font-bold tracking-[0.18em] text-foreground/45 uppercase">{label}</p>
                <p className="mt-1 text-lg leading-snug font-bold break-words text-foreground sm:text-xl">{value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {pages.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {pages.map(({ href, label, Icon }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-foreground/80 transition-all duration-300 hover:-translate-y-0.5 hover:border-white hover:bg-white hover:text-neutral-900"
            >
              <Icon size={15} />
              {label}
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
