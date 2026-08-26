import { NextResponse, type NextRequest } from "next/server";
import { getSessionAuth } from "@/lib/clerk-auth";
import { API_BASE_URL } from "@/lib/config";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = await (await getSessionAuth(request)).getToken();
  if (!token) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  try {
    const response = await fetch(`${API_BASE_URL}/playlists/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: await request.text(),
    });
    if (!response.ok) {
      console.error("PATCH /playlists upstream failed:", response.status, await response.text());
    }
    return new NextResponse(null, { status: response.status });
  } catch (error) {
    console.error("PATCH /playlists upstream threw:", error);
    return NextResponse.json({ error: "Upstream request failed" }, { status: 502 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = await (await getSessionAuth(request)).getToken();
  if (!token) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  try {
    const response = await fetch(`${API_BASE_URL}/playlists/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      console.error("DELETE /playlists upstream failed:", response.status, await response.text());
    }
    return new NextResponse(null, { status: response.status });
  } catch (error) {
    console.error("DELETE /playlists upstream threw:", error);
    return NextResponse.json({ error: "Upstream request failed" }, { status: 502 });
  }
}
