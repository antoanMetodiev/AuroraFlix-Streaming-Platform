import { NextResponse } from "next/server";
import { getSessionAuth } from "@/lib/clerk-auth";
import { getCurrentUser } from "@/lib/user-service";

// Same server-side proxy pattern as app/api/watchlist — lets client components
// (which can't call getCurrentUser directly, it needs a server-only Clerk
// token) find out the caller's plan without handling the token themselves.
export async function GET(request: Request) {
  const token = await (await getSessionAuth(request)).getToken();
  const user = await getCurrentUser(token);
  return NextResponse.json(user);
}
