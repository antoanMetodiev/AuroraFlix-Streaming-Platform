import { NextResponse } from "next/server";
import { getSessionAuth } from "@/lib/clerk-auth";
import { API_BASE_URL } from "@/lib/config";

// Same server-side proxy pattern as app/api/payments/checkout-session.
export async function POST(request: Request) {
  const token = await (await getSessionAuth(request)).getToken();
  if (!token) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  try {
    const response = await fetch(`${API_BASE_URL}/payments/portal-session`, {
      method: "POST",
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
