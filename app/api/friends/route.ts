import { NextResponse, type NextRequest } from "next/server";
import { getSessionAuth } from "@/lib/clerk-auth";
import { API_BASE_URL } from "@/lib/config";

/**
 * Proxies to lumo-api-gateway's /friends (which itself proxies to
 * lumo-user-svc), same reasoning as app/api/watchlist — this runs
 * server-side, so the Clerk token never has to leave our own origin.
 */
export async function GET(request: NextRequest) {
  const token = await (await getSessionAuth(request)).getToken();
  if (!token) return NextResponse.json([], { status: 200 });

  try {
    const response = await fetch(`${API_BASE_URL}/friends`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const body = await response.text();
    return new NextResponse(body, {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json({ error: "Upstream request failed" }, { status: 502 });
  }
}
