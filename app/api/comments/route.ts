import { NextResponse } from "next/server";
import { getSessionAuth } from "@/lib/clerk-auth";
import { API_BASE_URL } from "@/lib/config";

/**
 * Server-side proxy so the Clerk token never has to leave our own origin —
 * same pattern as app/api/payments/*. The gateway verifies the token and
 * derives the author's identity from it (see MovieCommentsController /
 * SeriesController) — this route just forwards commentText/recordId, never
 * anything claiming to say who the author is.
 */
export async function POST(request: Request) {
  const token = await (await getSessionAuth(request)).getToken();
  if (!token) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { type, recordId, commentText } = (await request.json()) as {
    type: "movie" | "series";
    recordId: string;
    commentText: string;
  };
  const path = type === "series" ? "/post-series-comment" : "/post-movie-comment";

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ commentText, cinemaRecordId: recordId }),
    });
    if (!response.ok) return NextResponse.json({ error: "Upstream request failed" }, { status: response.status });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Upstream request failed" }, { status: 502 });
  }
}
