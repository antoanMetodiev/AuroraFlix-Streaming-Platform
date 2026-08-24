import { NextResponse, type NextRequest } from "next/server";
import { getSessionAuth } from "@/lib/clerk-auth";
import { API_BASE_URL } from "@/lib/config";

/**
 * Same server-side proxy pattern as app/api/comments — see that route's doc
 * comment. Only commentId + reactionType are forwarded; the gateway derives
 * who's reacting from the verified Clerk token itself (see
 * MovieCommentsController.reactToMovieComment / SeriesController.reactToSeriesComment).
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ commentId: string }> }) {
  const { commentId } = await params;
  const token = await (await getSessionAuth(request)).getToken();
  if (!token) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { type, reactionType } = (await request.json()) as {
    type: "movie" | "series";
    reactionType: "LIKE" | "DISLIKE";
  };
  const path = type === "series" ? "/react-series-comment" : "/react-movie-comment";
  const query = new URLSearchParams({ commentId, reactionType }).toString();

  try {
    const response = await fetch(`${API_BASE_URL}${path}?${query}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return NextResponse.json({ error: "Upstream request failed" }, { status: response.status });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Upstream request failed" }, { status: 502 });
  }
}
