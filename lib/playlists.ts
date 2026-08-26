export type Playlist = {
  id: string;
  ownerId: string;
  name: string;
  isPublic: boolean;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
};

// Same shape as LikedItem (lib/likes.ts) — one row per movie/series in a playlist.
export type PlaylistItem = {
  id: string;
  tmdbId?: string | null;
  title?: string;
  posterImgURL?: string | null;
  tmdbRating?: string;
  type?: "MOVIE" | "TV-SHOW";
  videoId?: string;
};

type PlaylistItemResponse = {
  recordId: string;
  tmdbId: string | null;
  title: string | null;
  posterImgURL: string | null;
  tmdbRating: string | null;
  type: string | null;
  videoId: string | null;
};

function mapPlaylistItems(items: PlaylistItemResponse[]): PlaylistItem[] {
  return items.map((entry) => ({
    id: entry.recordId,
    tmdbId: entry.tmdbId,
    title: entry.title ?? undefined,
    posterImgURL: entry.posterImgURL,
    tmdbRating: entry.tmdbRating ?? undefined,
    type: entry.type as PlaylistItem["type"],
    videoId: entry.videoId ?? undefined,
  }));
}

export async function getPlaylists(): Promise<Playlist[]> {
  try {
    const response = await fetch("/api/playlists", { cache: "no-store" });
    if (!response.ok) return [];
    return (await response.json()) as Playlist[];
  } catch {
    return [];
  }
}

// Someone else's playlists — public, friends-only visibility is enforced
// server-side (see lumo-user-svc's playlists.Service.ListForUser); a
// stranger or non-friend just gets an empty array back.
export async function getPlaylistsForUser(clerkId: string): Promise<Playlist[]> {
  try {
    const response = await fetch(`/api/playlists/user/${encodeURIComponent(clerkId)}`, { cache: "no-store" });
    if (!response.ok) return [];
    return (await response.json()) as Playlist[];
  } catch {
    return [];
  }
}

export async function createPlaylist(name: string, isPublic: boolean): Promise<Playlist | null> {
  try {
    const response = await fetch("/api/playlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, isPublic }),
    });
    if (!response.ok) return null;
    return (await response.json()) as Playlist;
  } catch {
    return null;
  }
}

export async function updatePlaylist(id: string, name: string, isPublic: boolean): Promise<boolean> {
  try {
    const response = await fetch(`/api/playlists/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, isPublic }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function deletePlaylist(id: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/playlists/${encodeURIComponent(id)}`, { method: "DELETE" });
    return response.ok;
  } catch {
    return false;
  }
}

export async function getPlaylistItems(id: string): Promise<PlaylistItem[]> {
  try {
    const response = await fetch(`/api/playlists/${encodeURIComponent(id)}/items`, { cache: "no-store" });
    if (!response.ok) return [];
    return mapPlaylistItems((await response.json()) as PlaylistItemResponse[]);
  } catch {
    return [];
  }
}

// "limit" means the playlist already has the max number of titles (see
// lumo-user-svc's playlists package — 409, distinct from a generic
// failure) — the cap is never advertised upfront, only surfaced when hit.
export type AddPlaylistItemResult = "ok" | "limit" | "error";

export async function addPlaylistItem(id: string, item: PlaylistItem): Promise<AddPlaylistItemResult> {
  try {
    const response = await fetch(`/api/playlists/${encodeURIComponent(id)}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recordId: item.id,
        tmdbId: item.tmdbId,
        title: item.title,
        posterImgURL: item.posterImgURL,
        tmdbRating: item.tmdbRating,
        type: item.type,
        videoId: item.videoId,
      }),
    });
    if (response.ok) return "ok";
    if (response.status === 409) return "limit";
    return "error";
  } catch {
    return "error";
  }
}

export async function removePlaylistItem(id: string, recordId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/playlists/${encodeURIComponent(id)}/items/${encodeURIComponent(recordId)}`, { method: "DELETE" });
    return response.ok;
  } catch {
    return false;
  }
}
