export type LikedItem = {
  id: string;
  tmdbId?: string | null;
  title?: string;
  posterImgURL?: string | null;
  tmdbRating?: string;
  type?: "MOVIE" | "TV-SHOW";
  videoId?: string;
};

type LikedItemResponse = {
  recordId: string;
  tmdbId: string | null;
  title: string | null;
  posterImgURL: string | null;
  tmdbRating: string | null;
  type: string | null;
  videoId: string | null;
};

function mapLikedItems(items: LikedItemResponse[]): LikedItem[] {
  return items.map((entry) => ({
    id: entry.recordId,
    tmdbId: entry.tmdbId,
    title: entry.title ?? undefined,
    posterImgURL: entry.posterImgURL,
    tmdbRating: entry.tmdbRating ?? undefined,
    type: entry.type as LikedItem["type"],
    videoId: entry.videoId ?? undefined,
  }));
}

// Signed-in only, no offline/localStorage fallback (unlike watchlist) — a
// like isn't meaningful without an account behind it, so there's no
// anonymous case to support.
export async function getLikes(): Promise<LikedItem[]> {
  try {
    const response = await fetch("/api/likes", { cache: "no-store" });
    if (!response.ok) return [];
    return mapLikedItems((await response.json()) as LikedItemResponse[]);
  } catch {
    return [];
  }
}

// Someone else's likes — deliberately public among any signed-in caller,
// no friendship required (see the backend's getLikesForUser doc comment).
export async function getLikesForUser(clerkId: string): Promise<LikedItem[]> {
  try {
    const response = await fetch(`/api/likes/user/${encodeURIComponent(clerkId)}`, { cache: "no-store" });
    if (!response.ok) return [];
    return mapLikedItems((await response.json()) as LikedItemResponse[]);
  } catch {
    return [];
  }
}

// "limit" means the caller already has the max number of liked titles (see
// lumo-user-svc's likes package — 409, distinct from a generic failure) —
// the cap itself is never advertised upfront, only surfaced when actually hit.
export type AddLikeResult = "ok" | "limit" | "error";

export async function addLike(item: LikedItem): Promise<AddLikeResult> {
  try {
    const response = await fetch("/api/likes", {
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

export async function removeLike(id: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/likes/${encodeURIComponent(id)}`, { method: "DELETE" });
    return response.ok;
  } catch {
    return false;
  }
}
