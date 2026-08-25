import { NextResponse, type NextRequest } from "next/server";
import { getSessionAuth } from "@/lib/clerk-auth";
import { API_BASE_URL } from "@/lib/config";

// Reading this list clears it server-side (see lumo-user-svc's
// friends.Repository.ConsumeNotifications) — there's no separate mark-read
// step, "checking" the notifications tray is the read.
export async function GET(request: NextRequest) {
  const token = await (await getSessionAuth(request)).getToken();
  if (!token) return NextResponse.json([], { status: 200 });

  try {
    const response = await fetch(`${API_BASE_URL}/friends/notifications`, {
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
