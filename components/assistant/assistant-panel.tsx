"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ArrowRight, Bot, Film, Loader2, RotateCcw, Send, Sparkles, Star, Tv, X } from "lucide-react";
import { useTranslation } from "@/lib/i18n/locale-context";
import { tmdbImage } from "@/lib/tmdb";
import type { ResolvedCard } from "@/lib/assistant-tools";
import type { TranslationKey } from "@/lib/i18n/dictionary";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  titles?: ResolvedCard[];
  isError?: boolean;
};

const SUGGESTION_KEYS: TranslationKey[] = ["assistant.suggestion1", "assistant.suggestion2", "assistant.suggestion3"];
const MAX_HISTORY_SENT = 8;

// Full-width "spotlight" result — one movie/series per row with enough
// detail (poster, description, genres, rating, a couple of stills) to be
// useful on its own, not just a thumbnail hoping to catch the eye in a
// scroll-past row. Navigating away closes the chat modal (onNavigate) so the
// title's own page isn't left sitting underneath it.
function SpotlightCard({ card, onNavigate }: { card: ResolvedCard; onNavigate: () => void }) {
  const { t } = useTranslation();
  const href = card.mediaType === "series" ? `/series/${card.id}` : `/movies/${card.slug}`;
  const poster = tmdbImage(card.posterImgURL, "w500");
  const TypeIcon = card.mediaType === "movie" ? Film : Tv;
  const genres = card.genres
    ?.split(",")
    .map((g) => g.trim())
    .filter(Boolean)
    .slice(0, 3);

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-foreground/[0.04]">
      <div className="flex gap-3 p-3">
        <div className="relative aspect-[2/3] w-24 shrink-0 overflow-hidden rounded-lg bg-foreground/10 sm:w-28">
          {poster ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={poster} alt={card.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-foreground/30">
              <TypeIcon size={24} />
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h3 className="line-clamp-1 text-sm font-bold text-foreground">{card.title}</h3>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-medium text-foreground/55">
            {card.tmdbRating && (
              <span className="flex items-center gap-1 text-amber-400">
                <Star size={11} className="fill-amber-400" />
                {Number(card.tmdbRating).toFixed(1)}
              </span>
            )}
            {card.year && <span>{card.year}</span>}
            {genres?.map((genre) => (
              <span key={genre} className="rounded-full bg-foreground/10 px-2 py-0.5 text-foreground/60">
                {genre}
              </span>
            ))}
          </div>
          {card.description && <p className="line-clamp-3 text-xs leading-relaxed text-foreground/60">{card.description}</p>}
        </div>
      </div>

      {card.images.length > 0 && (
        <div className="flex gap-1.5 px-3 pb-3">
          {card.images.map((image, index) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={index}
              src={tmdbImage(image, "w500") ?? image}
              alt=""
              className="h-16 flex-1 rounded-md object-cover sm:h-20"
            />
          ))}
        </div>
      )}

      <Link
        href={href}
        onClick={onNavigate}
        className="flex w-full items-center justify-center gap-1.5 border-t border-white/10 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-white/5"
      >
        {t("assistant.viewTitle")}
        <ArrowRight size={13} />
      </Link>
    </div>
  );
}

// Renders the model's reply with just enough structure to read well — real
// line breaks (the model is asked to put each recommended title on its own
// line) and **bold** around title names, without pulling in a full markdown
// dependency for what's otherwise plain, short chat text.
function FormattedText({ text }: { text: string }) {
  const lines = text.split("\n").filter((line) => line.trim().length > 0);

  return (
    <div className="space-y-1.5">
      {lines.map((line, lineIndex) => (
        <p key={lineIndex}>
          {line.split(/(\*\*.+?\*\*)/g).map((chunk, chunkIndex) => {
            const boldMatch = chunk.match(/^\*\*(.+)\*\*$/);
            return boldMatch ? <strong key={chunkIndex}>{boldMatch[1]}</strong> : <Fragment key={chunkIndex}>{chunk}</Fragment>;
          })}
        </p>
      ))}
    </div>
  );
}

export function AssistantPanel({ onClose }: { onClose: () => void }) {
  const { t, locale } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          locale,
          history: nextMessages.slice(-MAX_HISTORY_SENT).map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (response.status === 429) {
        setMessages((prev) => [...prev, { role: "assistant", content: t("assistant.rateLimited"), isError: true }]);
        return;
      }
      if (!response.ok) {
        setMessages((prev) => [...prev, { role: "assistant", content: t("assistant.errorGeneric"), isError: true }]);
        return;
      }

      const data = (await response.json()) as { message: string; titles: ResolvedCard[] };
      setMessages((prev) => [...prev, { role: "assistant", content: data.message, titles: data.titles }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: t("assistant.errorGeneric"), isError: true }]);
    } finally {
      setIsLoading(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 pb-[6vh]" onClick={onClose}>
      <div className="animate-modal-backdrop-in absolute inset-0 bg-black/75 backdrop-blur-md" />

      <div
        onClick={(event) => event.stopPropagation()}
        className="animate-modal-card-in relative flex h-[82vh] max-h-[760px] w-full max-w-lg flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-surface shadow-[0_30px_90px_-15px_rgba(0,0,0,0.7)]"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-white/[0.06] to-transparent" />

        <div className="relative flex shrink-0 items-center justify-between border-b border-white/10 px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white">
              <Sparkles size={19} />
            </span>
            <div>
              <h2 className="text-lg leading-tight font-bold tracking-tight text-foreground">{t("assistant.title")}</h2>
              <p className="text-xs text-foreground/50">{t("assistant.subtitle")}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => setMessages([])}
                aria-label={t("assistant.newChat")}
                title={t("assistant.newChat")}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground/5 text-foreground/60 transition-all duration-200 hover:scale-105 hover:bg-foreground/10 hover:text-foreground"
              >
                <RotateCcw size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label={t("assistant.closeAria")}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground/5 text-foreground/60 transition-all duration-200 hover:scale-105 hover:bg-foreground/10 hover:text-foreground"
            >
              <X size={19} />
            </button>
          </div>
        </div>

        <div ref={scrollRef} className="relative min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {messages.length === 0 && (
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
                  <Bot size={14} />
                </span>
                <p className="rounded-2xl rounded-tl-sm bg-foreground/[0.06] px-4 py-3 text-sm leading-relaxed text-foreground/85">
                  {t("assistant.greeting")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 pl-9">
                {SUGGESTION_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => sendMessage(t(key))}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-foreground/70 transition-colors hover:border-white/25 hover:bg-white/10 hover:text-foreground"
                  >
                    {t(key)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <div key={index} className="flex flex-col gap-2.5">
              <div className={`flex items-start gap-2.5 ${message.role === "user" ? "flex-row-reverse" : ""}`}>
                {message.role === "assistant" && (
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
                    <Bot size={14} />
                  </span>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    message.role === "user"
                      ? "ml-auto rounded-tr-sm bg-white text-neutral-900"
                      : message.isError
                        ? "rounded-tl-sm border border-red-400/20 bg-red-500/10 text-red-300"
                        : "rounded-tl-sm bg-foreground/[0.06] text-foreground/85"
                  }`}
                >
                  <FormattedText text={message.content} />
                </div>
              </div>

              {message.titles && message.titles.length > 0 && (
                <div className="flex flex-col gap-3 pl-9">
                  {message.titles.map((card) => (
                    <SpotlightCard key={`${card.mediaType}-${card.id}`} card={card} onNavigate={onClose} />
                  ))}
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
                <Bot size={14} />
              </span>
              <p className="flex items-center gap-2 rounded-2xl rounded-tl-sm bg-foreground/[0.06] px-4 py-3 text-sm text-foreground/60">
                <Loader2 size={14} className="animate-spin" />
                {t("assistant.thinking")}
              </p>
            </div>
          )}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            sendMessage(input);
          }}
          className="relative flex shrink-0 items-center gap-2.5 border-t border-white/10 px-5 py-4"
        >
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={t("assistant.placeholder")}
            disabled={isLoading}
            className="min-w-0 flex-1 rounded-full border border-foreground/10 bg-foreground/5 px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/40 outline-none transition-colors focus:border-white/25 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            aria-label={t("assistant.send")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-neutral-900 transition-all duration-200 hover:scale-105 disabled:pointer-events-none disabled:opacity-40"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}
