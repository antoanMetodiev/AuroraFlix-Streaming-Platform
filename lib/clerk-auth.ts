import "server-only";
import { createClerkClient } from "@clerk/backend";

// Next.js 16 forces proxy.ts onto the Node.js runtime (no opt-out — see the
// "Runtime" section of node_modules/next/dist/docs/.../proxy.md), and
// @opennextjs/cloudflare currently refuses to build a Node.js
// middleware/proxy for Cloudflare Workers. So this app has no proxy.ts at
// all, and every route that needs the caller's Clerk session authenticates
// itself directly via @clerk/backend — the same primitive clerkMiddleware()
// would otherwise call on our behalf.
const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
});

const authorizedParties = [
  "http://localhost:3000",
  process.env.NEXT_PUBLIC_SITE_URL,
].filter((value): value is string => Boolean(value));

export async function getSessionAuth(request: Request) {
  const requestState = await clerkClient.authenticateRequest(request, {
    authorizedParties,
  });
  // toAuth() returns null for states authenticateRequest can't resolve on
  // its own (e.g. a handshake redirect would normally be needed) — treat
  // those the same as "signed out" since there's no proxy.ts to perform the
  // redirect dance.
  return requestState.toAuth() ?? { userId: null, getToken: async () => null };
}

export async function getClerkUser(request: Request) {
  const auth = await getSessionAuth(request);
  if (!auth.userId) return null;
  return clerkClient.users.getUser(auth.userId);
}
