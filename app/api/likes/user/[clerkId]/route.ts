import { NextResponse, type NextRequest } from "next/server";
import { getSessionAuth } from "@/lib/clerk-auth";
import { API_BASE_URL } from "@/lib/config";

// Deliberately public among any signed-in caller — see lumo-user-svc's
// getLikesForUser doc comment. Still requires a session (401 if signed
// out), just not any relationship to the target user.
export async function GET(request: NextRequest, { params }: { params: Promise<{ clerkId: string }> }) {
  const { clerkId } = await params;
  const token = await (await getSessionAuth(request)).getToken();
  if (!token) return NextResponse.json([], { status: 200 });

  try {
    const response = await fetch(`${API_BASE_URL}/likes/user/${encodeURIComponent(clerkId)}`, {
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
