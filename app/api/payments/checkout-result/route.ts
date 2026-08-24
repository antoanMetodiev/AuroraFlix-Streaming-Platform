import { NextResponse, type NextRequest } from "next/server";
import { getSessionAuth } from "@/lib/clerk-auth";
import { API_BASE_URL } from "@/lib/config";

// Same server-side proxy pattern as app/api/payments/subscription — the
// Clerk token never has to leave our own origin. Polled by
// CheckoutResultOverlay right after the Stripe redirect.
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

  const token = await (await getSessionAuth(request)).getToken();
  if (!token) return NextResponse.json(null, { status: 401 });

  try {
    const response = await fetch(`${API_BASE_URL}/payments/checkout-result?sessionId=${encodeURIComponent(sessionId)}`, {
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
