import { API_BASE_URL } from "@/lib/config";

export type SubscriptionType = "REGULAR_USER" | "PRO_USER";

export type CurrentUser = {
  clerkId: string;
  email: string;
  displayName: string | null;
  profileImageURL: string | null;
  subscriptionType: SubscriptionType;
  createdAt: string;
  updatedAt: string;
};

// Same gateway lib/api.ts already talks to — it verifies the Clerk session
// token and forwards to lumo-user-svc.

/**
 * Calls lumo-api-gateway's `GET /user/me` (proxied to lumo-user-svc). Needs a
 * Clerk session token — get one via `auth()` (server) or `useAuth().getToken()`
 * (client, through a route handler) and pass it in here.
 *
 * Returns null if there's no token, the request fails, or the account hasn't
 * been synced into the DB yet by the Clerk webhook (a real possibility right
 * after sign-up — the webhook and this request can race).
 */
export async function getCurrentUser(token: string | null): Promise<CurrentUser | null> {
  if (!token) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/user/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!response.ok) return null;
    return (await response.json()) as CurrentUser;
  } catch {
    return null;
  }
}
