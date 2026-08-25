/**
 * The gateway URL every backend call goes through. Auto-picks the local
 * gateway while running `next dev` (NODE_ENV is "development" — Next.js sets
 * this itself, can't be toggled by hand) and the deployed one otherwise, so
 * nothing needs to be switched manually between local and cloud testing.
 * An explicit API_BASE_URL env var always wins (e.g. for staging).
 */
export const API_BASE_URL =
  process.env.API_BASE_URL ??
  (process.env.NODE_ENV === "development" ? "http://localhost:8080" : "https://lumo-api-gateway.onrender.com");

// Same gateway, ws(s):// scheme — for the one thing that's a genuine direct
// browser-to-gateway connection instead of going through our own same-origin
// proxy (see lib/use-friend-request-socket.ts for why).
export const WS_BASE_URL = API_BASE_URL.replace(/^http/, "ws");
