import { NextResponse, type NextRequest } from "next/server";
import { getSessionAuth } from "@/lib/clerk-auth";
import { API_BASE_URL } from "@/lib/config";

// Read-only count for the badge — unlike GET /api/friends/notifications,
// polling this does NOT clear anything.
export async function GET(request: NextRequest) {
  const token = await (await getSessionAuth(request)).getToken();
  if (!token) return NextResponse.json({ count: 0 }, { status: 200 });

  try {
    const response = await fetch(`${API_BASE_URL}/friends/notifications/count`, {
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
