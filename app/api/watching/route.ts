import { NextResponse } from "next/server";
import { getSessionAuth } from "@/lib/clerk-auth";
import { API_BASE_URL } from "@/lib/config";

/**
 * Proxies to lumo-api-gateway's /watching (which itself proxies to
 * lumo-user-svc's in-memory presence store) — same reasoning as
 * app/api/friends: runs server-side, so the Clerk token never has to leave
 * our own origin.
 */
export async function PUT(request: Request) {
  const token = await (await getSessionAuth(request)).getToken();
  if (!token) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  try {
    const response = await fetch(`${API_BASE_URL}/watching`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: await request.text(),
    });
    return new NextResponse(null, { status: response.status });
  } catch (error) {
    console.error("PUT /watching upstream threw:", error);
    return NextResponse.json({ error: "Upstream request failed" }, { status: 502 });
  }
}

export async function DELETE(request: Request) {
  const token = await (await getSessionAuth(request)).getToken();
  if (!token) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  try {
    const response = await fetch(`${API_BASE_URL}/watching`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    return new NextResponse(null, { status: response.status });
  } catch (error) {
    console.error("DELETE /watching upstream threw:", error);
    return NextResponse.json({ error: "Upstream request failed" }, { status: 502 });
  }
}
