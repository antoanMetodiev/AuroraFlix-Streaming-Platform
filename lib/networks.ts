/**
 * The networks /series can be filtered by: the ten with the most series in
 * our catalog (title_facts.networks, counted 2026-11-14), each with its
 * TMDB network id and logo. `name` is the exact TMDB network name the
 * series service matches on (?network=). TBS, MBS, TOKYO MX and TV Tokyo
 * are the Japanese ones (anime) — that's what our catalog has.
 */
export const TOP_NETWORKS = [
  { name: "Netflix", tmdbId: 213, logo: "/wwemzKWzjKYJFfCeiB57q3r4Bcm.png" },
  { name: "Prime Video", tmdbId: 1024, logo: "/w7HfLNm9CWwRmAMU58udl2L7We7.png" },
  { name: "HBO", tmdbId: 49, logo: "/tuomPhY2UtuPTqqFnKMVHvSb724.png" },
  { name: "Apple TV", tmdbId: 2552, logo: "/bngHRFi794mnMq34gfVcm9nDxN1.png" },
  { name: "Hulu", tmdbId: 453, logo: "/pqUTCleNUiTLAVlelGxUgWn1ELh.png" },
  { name: "The CW", tmdbId: 71, logo: "/hEpcdJ4O6eitG9ADSnDXNUrlovS.png" },
  { name: "TOKYO MX", tmdbId: 614, logo: "/hSdroyVthq3CynxTIIY7lnS8w1.png" },
  { name: "TBS", tmdbId: 160, logo: "/lUACMATs6jcscXIrzNCQzbvNVN5.png" },
  { name: "MBS", tmdbId: 94, logo: "/7RNXnyiMbjgqtPAjja13wchcrGI.png" },
  { name: "TV Tokyo", tmdbId: 98, logo: "/jnuO8pZNEBLEq5YaOP1f5OkmG91.png" },
] as const;

export function isTopNetwork(name?: string | null): boolean {
  return !!name && TOP_NETWORKS.some((n) => n.name === name);
}
