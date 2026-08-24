const COOLDOWN_KEY = "AURORAFLIX_ORDER_COOLDOWN_UNTIL";
const COOLDOWN_SECONDS = 10;

/** Seconds left on an in-flight cooldown, persisted across reloads/navigation. */
export function getOrderCooldownRemaining(): number {
  if (typeof window === "undefined") return 0;
  const until = Number(window.localStorage.getItem(COOLDOWN_KEY));
  if (!until) return 0;
  return Math.max(0, Math.ceil((until - Date.now()) / 1000));
}

export function startOrderCooldown(): number {
  window.localStorage.setItem(COOLDOWN_KEY, String(Date.now() + COOLDOWN_SECONDS * 1000));
  return COOLDOWN_SECONDS;
}
