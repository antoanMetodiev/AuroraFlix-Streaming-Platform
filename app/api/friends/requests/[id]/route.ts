import { NextResponse } from "next/server";
import { getSessionAuth } from "@/lib/clerk-auth";
import { API_BASE_URL } from "@/lib/config";

// Handles both canceling a request you sent and declining one you received
// — the backend's DELETE /friends/requests/{id} is the same operation
// either way (see lumo-user-svc's friends.Service.CancelOrDecline).
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = await (await getSessionAuth(request)).getToken();
  if (!token) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  try {
    const response = await fetch(`${API_BASE_URL}/friends/requests/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      console.error("DELETE /friends/requests upstream failed:", response.status, await response.text());
    }
    return new NextResponse(null, { status: response.status });
  } catch (error) {
    console.error("DELETE /friends/requests upstream threw:", error);
    return NextResponse.json({ error: "Upstream request failed" }, { status: 502 });
  }
}
