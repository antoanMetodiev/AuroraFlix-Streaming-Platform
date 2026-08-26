"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { PlayerSection } from "@/components/movies/details/player-section";
import { Loader } from "@/components/ui/loader";
import { orderEpisodes } from "@/lib/episodes";
import { tmdbImage } from "@/lib/tmdb";
import type { Episode } from "@/types/episode";
import type { Series } from "@/types/series";

// This file is already a Client Component, so — unlike the sections split out
// via components/movies/details/lazy-sections.tsx for the (Server Component)
// details page — the split here is real without needing a separate boundary.
const EpisodesSection = dynamic(() => import("@/components/movies/details/episodes-section").then((mod) => mod.EpisodesSection), {
  loading: () => <Loader />,
});

export function SeriesWatchSection({ record }: { record: Series }) {
  const episodes = record.allEpisodes ?? [];
  // The series record itself has no playable videoURL — only episodes do —
  // so default to the first episode (by season/episode order) instead of
  // leaving the player empty until the user picks one manually.
  const [currentVideo, setCurrentVideo] = useState(record.videoURL || orderEpisodes(episodes)[0]?.videoURL || "");
  const playerWrapperRef = useRef<HTMLDivElement>(null);

  const handleSelectEpisode = (episode: Episode) => {
    setCurrentVideo(episode.videoURL);
    window.setTimeout(() => {
      playerWrapperRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  return (
    <>
      <PlayerSection
        ref={playerWrapperRef}
        videoUrl={currentVideo}
        title={record.title}
        poster={tmdbImage(record.backgroundImg_URL ?? record.posterImgURL, "w1280")}
      />
      <EpisodesSection episodes={episodes} recordId={record.id} recordTitle={record.title} onSelectEpisode={handleSelectEpisode} />
    </>
  );
}
