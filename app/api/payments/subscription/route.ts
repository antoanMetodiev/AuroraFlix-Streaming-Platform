import { NextResponse } from "next/server";
import { getSessionAuth } from "@/lib/clerk-auth";
import { API_BASE_URL } from "@/lib/config";

// Same server-side proxy pattern as app/api/watchlist — the Clerk token
// never has to leave our own origin.
export async function GET(request: Request) {
  const token = await (await getSessionAuth(request)).getToken();
  if (!token) return NextResponse.json(null, { status: 200 });

  try {
    const response = await fetch(`${API_BASE_URL}/payments/subscription`, {
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
