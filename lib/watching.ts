export type WatchingType = "movie" | "series";

export type WatchingTarget = {
  tmdbId: string;
  type: WatchingType;
  title: string;
  season?: number;
  episode?: number;
};

export type FriendWatching = {
  clerkId: string;
  watching: WatchingTarget;
};

// Both calls are fire-and-forget from the caller's point of view (see
// use-watching-presence.ts) — a missed heartbeat or a clear that never
// makes it just means a friend sees a stale/no status until the next one,
// never something worth surfacing as an error. keepalive lets the browser
// still send these when they fire from an unmount/visibilitychange right as
// the tab is navigating away or closing.
export async function setWatching(target: WatchingTarget): Promise<void> {
  try {
    await fetch("/api/watching", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(target),
      keepalive: true,
    });
  } catch {
    // best-effort — see doc comment above
  }
}

export async function clearWatching(): Promise<void> {
  try {
    await fetch("/api/watching", { method: "DELETE", keepalive: true });
  } catch {
    // best-effort — see doc comment above
  }
}

// The initial snapshot for a friends list rendered before any live push has
// happened yet (e.g. a friend was already watching something when this page
// loaded) — live updates after that come from watching-events.ts instead.
export async function getFriendsWatching(): Promise<FriendWatching[]> {
  const response = await fetch("/api/watching/friends", { cache: "no-store" });
  if (!response.ok) return [];
  return (await response.json()) as FriendWatching[];
}
