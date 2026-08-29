import "server-only";

// Free tier via Google AI Studio, no card required. Exact live RPM/RPD numbers
// vary by account and change over time — check aistudio.google.com/rate-limit
// rather than trusting a hardcoded number here.
export const ASSISTANT_MODEL = "gemini-3.5-flash-lite";

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${ASSISTANT_MODEL}:generateContent`;

export type GeminiMessage = { role: "user" | "assistant"; content: string };

export class GeminiRateLimitError extends Error {
  constructor() {
    super("Gemini rate limit exceeded");
    this.name = "GeminiRateLimitError";
  }
}

/**
 * Thin wrapper around Gemini's generateContent REST endpoint. Not a full
 * SDK — this app only ever needs one call shape (a single JSON-mode chat
 * completion with a system instruction), so a fetch wrapper avoids pulling
 * in a dependency for it.
 *
 * Gemini's wire format differs from the OpenAI-style shape Groq used: the
 * system prompt is its own top-level field (not a "system" message), and
 * conversation turns use "user"/"model" roles instead of "user"/"assistant".
 */
export async function geminiChat(options: {
  apiKey: string;
  systemPrompt: string;
  messages: GeminiMessage[];
  responseFormatJson?: boolean;
  maxTokens?: number;
}): Promise<string> {
  const response = await fetch(`${GEMINI_URL}?key=${options.apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: options.systemPrompt }] },
      contents: options.messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: options.maxTokens ?? 1200,
        responseMimeType: options.responseFormatJson ? "application/json" : "text/plain",
      },
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (response.status === 429) throw new GeminiRateLimitError();
  if (!response.ok) throw new Error(`Gemini request failed: ${response.status} ${await response.text()}`);

  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
    promptFeedback?: { blockReason?: string };
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error(`Gemini returned no content (blockReason: ${data.promptFeedback?.blockReason ?? "none"})`);

  return text;
}
