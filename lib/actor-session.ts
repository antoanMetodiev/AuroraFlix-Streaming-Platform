import type { Actor } from "@/types/actor";

const STORAGE_KEY = "AURORAFLIX_PENDING_ACTOR";

type PendingActor = {
  actor: Actor;
  backgroundImgUrl?: string | null;
};

/**
 * The backend has no "get actor by id" endpoint — full actor data only exists
 * embedded in a movie/series' castList. So, same as the old app's router-state
 * trick, the actor object is handed off through sessionStorage right before
 * navigating to its page. This only works when navigating from within the app
 * (a direct/bare visit to /actors/[id] has nothing to read) — see lib/actor-session.ts
 * callers for the deliberate, discussed tradeoff.
 */
export function setPendingActor(actor: Actor, backgroundImgUrl?: string | null) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ actor, backgroundImgUrl } satisfies PendingActor));
}

export function consumePendingActor(id: string): PendingActor | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as PendingActor;
    return parsed.actor?.id === id ? parsed : null;
  } catch {
    return null;
  }
}
