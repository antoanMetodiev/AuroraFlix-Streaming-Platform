import { NextResponse, type NextRequest } from "next/server";
import { getSessionAuth } from "@/lib/clerk-auth";
import { API_BASE_URL } from "@/lib/config";

// Same server-side proxy pattern as app/api/comments — see that route's doc
// comment. Ownership itself is enforced by the gateway/downstream services
// (comparing the verified Clerk id against the comment's own authorId), not
// here — this route only forwards the request with the caller's token attached.

export async function PUT(request: NextRequest, { params }: { params: Promise<{ commentId: string }> }) {
  const { commentId } = await params;
  const token = await (await getSessionAuth(request)).getToken();
  if (!token) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { type, recordId, commentText } = (await request.json()) as {
    type: "movie" | "series";
    recordId: string;
    commentText: string;
  };
  const path = type === "series" ? "/update-series-comment" : "/update-movie-comment";
  const query = new URLSearchParams({ commentId, movieId: recordId }).toString();

  try {
    const response = await fetch(`${API_BASE_URL}${path}?${query}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ commentText }),
    });
    if (!response.ok) return NextResponse.json({ error: "Upstream request failed" }, { status: response.status });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Upstream request failed" }, { status: 502 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ commentId: string }> }) {
  const { commentId } = await params;
  const token = await (await getSessionAuth(request)).getToken();
  if (!token) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const type = request.nextUrl.searchParams.get("type") === "series" ? "series" : "movie";
  const recordId = request.nextUrl.searchParams.get("recordId");
  if (!recordId) return NextResponse.json({ error: "Missing recordId" }, { status: 400 });

  const path = type === "series" ? "/delete-series-comment" : "/delete-movie-comment";
  const query = new URLSearchParams({ commentId, movieId: recordId }).toString();

  try {
    const response = await fetch(`${API_BASE_URL}${path}?${query}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return NextResponse.json({ error: "Upstream request failed" }, { status: response.status });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Upstream request failed" }, { status: 502 });
  }
}
