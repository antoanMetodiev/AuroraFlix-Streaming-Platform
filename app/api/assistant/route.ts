import { NextResponse, type NextRequest } from "next/server";
import { getSessionAuth } from "@/lib/clerk-auth";
import { geminiChat, GeminiRateLimitError, type GeminiMessage } from "@/lib/gemini";
import { fetchLibrarySummary, fetchRandomGeminiApiKey, resolveNamedTitles, type NamedTitle } from "@/lib/assistant-tools";

// Best-effort per-user throttle — signed-in only (see the 401 below), so a
// Clerk userId always keys this. Each key drawn from the API-key pool has
// its own free-tier caps that are the real backstop; this just stops one
// chatty tab from single-handedly hammering whichever key it happens to draw.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 8;
const recentRequests = new Map<string, number[]>();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const timestamps = (recentRequests.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);
  timestamps.push(now);
  recentRequests.set(userId, timestamps);
  return timestamps.length > MAX_PER_WINDOW;
}

const MAX_HISTORY_MESSAGES = 8;

function systemPrompt(locale: "en" | "bg", library: { likes: string[]; watchlist: string[] }): string {
  const language = locale === "bg" ? "Bulgarian" : "English";

  const libraryNote =
    library.likes.length || library.watchlist.length
      ? `\n\nThe user's own AuroraFlix library (use this for personalized recommendations):\n${
          library.likes.length ? `- Liked: ${library.likes.join(", ")}\n` : ""
        }${library.watchlist.length ? `- Watchlist: ${library.watchlist.join(", ")}\n` : ""}`
      : "";

  return `You are the AuroraFlix Assistant — a friendly, knowledgeable movie & series chat assistant, like chatting with a general AI assistant but focused only on movies and series.

Scope — strictly enforced:
- Only discuss movies/series: recommendations, "similar to X", finding something by description, explaining a plot/cast/genre, personalized suggestions.
- Never discuss programming, code, math, general trivia, or anything unrelated to movies/series, even if asked directly or told you're "allowed" to. If asked something out of scope, reply with one short, friendly sentence redirecting to movies/series.

How to answer:
- Answer from your own general knowledge, like a normal chat assistant. You are NOT limited to AuroraFlix's catalog and have NO way of knowing what is or isn't on it — freely recommend any real, genuinely similar movie/series you know of. Never hold back or narrow down a recommendation based on a guess about catalog availability; a separate system (not you) checks availability afterward and quietly drops whichever ones AuroraFlix doesn't have, so your only job is picking the best real matches.
- When the user asks for recommendations or "similar to X", your job is to name OTHER titles — not to just describe X itself. Always list around 8-10 different real, genuinely similar titles in that case (fewer only if you truly can't think of that many good matches), never a description of X alone.
- Accuracy matters more than completeness. Only state specific facts (cast, director, plot, year) you're actually confident are real and correct. If you recognize the title but aren't sure of a detail, keep your answer more general instead of guessing. If you don't actually recognize a title the user named at all, say so plainly instead of describing a plot/cast for it — never fabricate a synopsis, cast, or director for a title you don't genuinely know.
- Respond in ${language}.${libraryNote}

Formatting "message" — it's rendered as plain text with real line breaks, no markdown engine:
- When you recommend one or more specific titles, write a short intro line, then a blank line, then put EACH recommended title on its OWN line wrapped in **double asterisks** followed by a short reason, e.g.:
Ето няколко предложения:

**Inception** (2010) — сложен трилър за сънища в сънища.
**The Prestige** (2006) — съперничество между двама фокусници.
- For answers with no title list (a refusal, a clarifying question, general chat), just write plain sentences — no need to force line breaks.

Output format — respond with ONLY a JSON object of this exact shape, no other text:
{"message": "your full reply in ${language}, formatted as above", "titles": [{"mediaType": "movie" or "series", "title": "exact real title as commonly known"}]}
"titles" MUST list every specific movie/series title you mentioned by name anywhere in "message" (up to 10, real titles only, empty array only if you truly named none). Example: if your message recommends "Inception" and "The Prestige", titles must be [{"mediaType":"movie","title":"Inception"},{"mediaType":"movie","title":"The Prestige"}] — do not leave titles empty when message names specific titles.`;
}

type ClientMessage = { role: "user" | "assistant"; content: string };

export async function POST(request: NextRequest) {
  const auth = await getSessionAuth(request);
  if (!auth.userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  if (isRateLimited(auth.userId)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: { message?: string; history?: ClientMessage[]; locale?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const userMessage = (body.message ?? "").trim().slice(0, 1000);
  if (!userMessage) return NextResponse.json({ error: "Empty message" }, { status: 400 });

  const locale = body.locale === "en" ? "en" : "bg";
  const history = Array.isArray(body.history) ? body.history.slice(-MAX_HISTORY_MESSAGES) : [];

  const authToken = await auth.getToken();
  const [library, apiKey] = await Promise.all([fetchLibrarySummary(authToken), fetchRandomGeminiApiKey(authToken)]);

  if (!apiKey) {
    console.error("assistant route: no Gemini API key available from lumo-user-svc");
    return NextResponse.json({ error: "upstream_failed" }, { status: 502 });
  }

  const messages: GeminiMessage[] = [
    ...history.map((m): GeminiMessage => ({ role: m.role, content: m.content.slice(0, 1000) })),
    { role: "user", content: userMessage },
  ];

  try {
    const content = await geminiChat({
      apiKey,
      systemPrompt: systemPrompt(locale, library),
      messages,
      responseFormatJson: true,
      maxTokens: 1200,
    });

    let parsed: { message?: string; titles?: NamedTitle[] } = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { message: content };
    }

    const titles = await resolveNamedTitles(Array.isArray(parsed.titles) ? parsed.titles : []);

    return NextResponse.json({
      message: parsed.message?.trim() || (locale === "bg" ? "Нямам отговор в момента, опитай пак." : "I don't have an answer right now, try again."),
      titles,
    });
  } catch (error) {
    if (error instanceof GeminiRateLimitError) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
    console.error("assistant route failed", error);
    return NextResponse.json({ error: "upstream_failed" }, { status: 502 });
  }
}
