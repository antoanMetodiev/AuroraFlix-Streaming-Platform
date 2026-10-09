"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BellRing, Clock, RefreshCw } from "lucide-react";
import { getSeasonEpisodes, getSeasonOptions, orderEpisodes } from "@/lib/episodes";
import { checkForNewEpisodes } from "@/lib/api-public";
import { useInViewOnce } from "@/lib/use-in-view-once";
import { Spinner } from "@/components/ui/loader";
import { ModernSelect } from "@/components/ui/modern-select";
import { EpisodeCard } from "@/components/movies/details/episode-card";
import { SectionHeading } from "@/components/movies/details/section-heading";
import { useTranslation } from "@/lib/i18n/locale-context";
import type { Episode } from "@/types/episode";

const CHECK_COOLDOWN_MS = 60 * 1000;
const COOLDOWN_STORAGE_KEY = "lastCheckForNewEpisodesGlobal";

export function EpisodesSection({
  episodes,
  recordId,
  recordTitle,
  onSelectEpisode,
}: {
  episodes: Episode[];
  recordId: string;
  recordTitle: string;
  onSelectEpisode: (episode: Episode) => void;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const { ref, inView } = useInViewOnce<HTMLElement>(0.1);

  const orderedEpisodes = orderEpisodes(episodes);
  const seasons = getSeasonOptions(orderedEpisodes);
  const [selectedSeason, setSelectedSeason] = useState(seasons[0] ?? "1");
  const [remainingMs, setRemainingMs] = useState(0);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const updateRemaining = () => {
      const lastCheck = window.localStorage.getItem(COOLDOWN_STORAGE_KEY);
      if (!lastCheck) {
        setRemainingMs(0);
        return;
      }
      const diff = CHECK_COOLDOWN_MS - (Date.now() - Number(lastCheck));
      setRemainingMs(diff > 0 ? diff : 0);
    };

    updateRemaining();
    const interval = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const seasonEpisodes = getSeasonEpisodes(selectedSeason, orderedEpisodes);
  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);

  const handleCheckForNewEpisodes = async () => {
    if (remainingMs > 0 || checking) return;
    setChecking(true);
    await checkForNewEpisodes(recordId, recordTitle);
    window.localStorage.setItem(COOLDOWN_STORAGE_KEY, Date.now().toString());
    setRemainingMs(CHECK_COOLDOWN_MS);
    setChecking(false);

    // New episodes take time to show up on the backend, so there's nothing to
    // refresh on this page yet — briefly show the "checking started" message,
    // then send the user home instead of leaving them stuck waiting here.
    window.setTimeout(() => router.push("/"), 1500);
  };

  if (episodes.length === 0) return null;

  return (
    <section
      ref={ref}
      className={`mx-auto my-16 max-w-[90rem] px-4 transition-all duration-1000 sm:my-24 sm:px-6 ${
        inView ? "translate-y-0 opacity-100" : "translate-y-14 opacity-0"
      }`}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4 sm:mb-5">
        <SectionHeading className="mb-0">{t("sections.episodes")}</SectionHeading>

        {seasons.length > 1 && (
          <ModernSelect
            value={selectedSeason}
            onChange={setSelectedSeason}
            options={seasons.map((season) => ({ value: season, label: `${t("sections.season")} ${season}` }))}
          />
        )}
      </div>

      {/*
       * Its own callout rather than a small grey button next to the season
       * picker — viewers kept asking whether new episodes were coming without
       * ever noticing the old button was there.
       */}
      <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
            <BellRing size={20} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white sm:text-base">{t("episodes.newTitle")}</p>
            <p className="text-xs text-white/60 sm:text-sm">{t("episodes.newHint")}</p>
          </div>
        </div>

        {remainingMs > 0 ? (
          <p className="flex shrink-0 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-xs font-semibold text-white/70 sm:text-sm">
            <Clock size={16} />
            {t("episodes.checking")} {minutes}:{seconds.toString().padStart(2, "0")}
          </p>
        ) : (
          <button
            type="button"
            onClick={handleCheckForNewEpisodes}
            disabled={checking}
            className="flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-semibold text-neutral-900 shadow-[0_4px_24px_-4px_rgba(255,255,255,0.55)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_-4px_rgba(255,255,255,0.7)] disabled:cursor-wait disabled:opacity-80 disabled:hover:translate-y-0 sm:text-sm"
          >
            {checking ? <Spinner size={16} /> : <RefreshCw size={16} />}
            {checking ? t("episodes.pleaseWait") : t("episodes.checkForNew")}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {seasonEpisodes.map((episode) => (
          <EpisodeCard key={episode.id} episode={episode} onSelect={() => onSelectEpisode(episode)} />
        ))}
      </div>
    </section>
  );
}
