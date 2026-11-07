import { NextResponse, type NextRequest } from "next/server";
import { getSessionAuth } from "@/lib/clerk-auth";
import { API_BASE_URL } from "@/lib/config";

// Same server-side proxy pattern as app/api/watchlist — see that file for why.
// Only for a signed-in viewer: signed out, positions stay in the browser.

async function forward(request: NextRequest, method: "GET" | "PUT" | "DELETE") {
  const token = await (await getSessionAuth(request)).getToken();
  if (!token) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  try {
    const response = await fetch(`${API_BASE_URL}/watch-progress${request.nextUrl.search}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(method === "PUT" ? { "Content-Type": "application/json" } : {}),
      },
      body: method === "PUT" ? await request.text() : undefined,
      cache: "no-store",
    });
    if (response.status === 204) return new NextResponse(null, { status: 204 });
    return new NextResponse(await response.text(), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json({ error: "Upstream request failed" }, { status: 502 });
  }
}

export function GET(request: NextRequest) {
  return forward(request, "GET");
}

export function PUT(request: NextRequest) {
  return forward(request, "PUT");
}

export function DELETE(request: NextRequest) {
  return forward(request, "DELETE");
}
