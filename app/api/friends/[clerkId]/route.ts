import { NextResponse } from "next/server";
import { getSessionAuth } from "@/lib/clerk-auth";
import { API_BASE_URL } from "@/lib/config";

export async function DELETE(request: Request, { params }: { params: Promise<{ clerkId: string }> }) {
  const { clerkId } = await params;
  const token = await (await getSessionAuth(request)).getToken();
  if (!token) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  try {
    const response = await fetch(`${API_BASE_URL}/friends/${encodeURIComponent(clerkId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      console.error("DELETE /friends upstream failed:", response.status, await response.text());
    }
    return new NextResponse(null, { status: response.status });
  } catch (error) {
    console.error("DELETE /friends upstream threw:", error);
    return NextResponse.json({ error: "Upstream request failed" }, { status: 502 });
  }
}
