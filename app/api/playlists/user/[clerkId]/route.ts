import { NextResponse, type NextRequest } from "next/server";
import { getSessionAuth } from "@/lib/clerk-auth";
import { API_BASE_URL } from "@/lib/config";

// Deliberately public among any signed-in caller — see lumo-user-svc's
// playlists.Service.ListForUser doc comment. The friendship/public gating
// happens downstream: a stranger just gets an empty list back, not a 403.
export async function GET(request: NextRequest, { params }: { params: Promise<{ clerkId: string }> }) {
  const { clerkId } = await params;
  const token = await (await getSessionAuth(request)).getToken();
  if (!token) return NextResponse.json([], { status: 200 });

  try {
    const response = await fetch(`${API_BASE_URL}/playlists/${encodeURIComponent(clerkId)}/visible`, {
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
