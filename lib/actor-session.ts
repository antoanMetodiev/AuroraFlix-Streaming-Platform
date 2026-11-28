import type { Actor } from "@/types/actor";

const STORAGE_KEY = "AURORAFLIX_PENDING_ACTOR";

type PendingActor = {
  actor: Actor;
  backgroundImgUrl?: string | null;
};

/**
 * The actor object is handed off through sessionStorage right before
 * navigating to its page. For /actors/{uuid} (cast members without an IMDb id
 * — the backend can only look actors up by IMDb id) this is the only data the
 * page has, so it works only when opened from within the app. /actors/{imdbId}
 * is server-rendered (app/actors/[id]/page.tsx) and only takes the backdrop
 * from here.
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
    // Cast cards with an IMDb id link to /actors/{imdbId} (the server-rendered
    // page), the rest to /actors/{id} — either one matches.
    return parsed.actor && (parsed.actor.id === id || parsed.actor.imdbId === id) ? parsed : null;
  } catch {
    return null;
  }
}
