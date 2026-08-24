import type { Episode } from "@/types/episode";

export function orderEpisodes(episodes: Episode[]): Episode[] {
  return [...episodes]
    .sort((a, b) => Number(a.episodeNumber) - Number(b.episodeNumber))
    .sort((a, b) => Number(a.season) - Number(b.season));
}

export function getSeasonEpisodes(season: string, episodes: Episode[]): Episode[] {
  return episodes.filter((episode) => episode.season === season);
}

export function getSeasonOptions(episodes: Episode[]) {
  return [...new Set(episodes.map((episode) => episode.season))]
    .filter((season): season is string => season !== undefined && season !== null)
    .sort((a, b) => Number(a) - Number(b));
}
