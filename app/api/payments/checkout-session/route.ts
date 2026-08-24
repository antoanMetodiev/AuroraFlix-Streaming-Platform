import { NextResponse } from "next/server";
import { getSessionAuth, getClerkUser } from "@/lib/clerk-auth";
import { API_BASE_URL } from "@/lib/config";

// Same server-side proxy pattern as app/api/watchlist — the Clerk token never
// has to leave our own origin. The email comes from the verified Clerk
// session server-side (getClerkUser()), not from the client, so it can't be
// spoofed by whoever calls this route.
export async function POST(request: Request) {
  const token = await (await getSessionAuth(request)).getToken();
  if (!token) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const user = await getClerkUser(request);
  const email = user?.primaryEmailAddress?.emailAddress;
  if (!email) return NextResponse.json({ error: "No email on file" }, { status: 400 });

  try {
    const response = await fetch(`${API_BASE_URL}/payments/checkout-session`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
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
