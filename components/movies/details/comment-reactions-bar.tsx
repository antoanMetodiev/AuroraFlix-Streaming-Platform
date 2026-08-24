"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { MoreHorizontal, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { formatDateTime } from "@/lib/dates";
import { useTranslation } from "@/lib/i18n/locale-context";
import type { CommentReactions, ReactionUser } from "@/types/comment";

function ReactorAvatar({ reactor, size }: { reactor: ReactionUser; size: number }) {
  const displayName = reactor.fullName || reactor.username || "?";

  return reactor.imgURL ? (
    <Image
      src={reactor.imgURL}
      alt=""
      width={size}
      height={size}
      loading="eager"
      className="shrink-0 rounded-full object-cover"
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-foreground/15 font-bold text-foreground/80"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {displayName.charAt(0).toUpperCase()}
    </span>
  );
}

function ReactorRow({ reactor, locale }: { reactor: ReactionUser; locale: string }) {
  const displayName = reactor.fullName || reactor.username || "?";

  return (
    <li className="flex items-center gap-2.5 px-3.5 py-2">
      <ReactorAvatar reactor={reactor} size={28} />
      <div className="min-w-0">
        <p className="truncate text-sm text-foreground/85">{displayName}</p>
        <p className="truncate text-[11px] text-foreground/40">{formatDateTime(reactor.createdAt, locale)}</p>
      </div>
    </li>
  );
}

/**
 * Like/dislike row shown under a comment. Each thumb is its own toggle
 * button (own reaction, mutually exclusive — see MovieService/
 * SeriesService.reactToComment); the "who reacted" affordance lives
 * separately right next to it — first reactor's photo + a "more" glyph —
 * and opens a shared panel listing everyone who reacted that way.
 */
export function CommentReactionsBar({
  reactions,
  isSignedIn,
  currentUserId,
  onReact,
}: {
  reactions: CommentReactions | undefined;
  isSignedIn: boolean;
  currentUserId: string | undefined;
  onReact: (reactionType: "LIKE" | "DISLIKE") => void;
}) {
  const { t, locale } = useTranslation();
  const [openPanel, setOpenPanel] = useState<"likes" | "dislikes" | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const likes = reactions?.likes ?? [];
  const dislikes = reactions?.dislikes ?? [];
  const iLiked = !!currentUserId && likes.some((reactor) => reactor.userId === currentUserId);
  const iDisliked = !!currentUserId && dislikes.some((reactor) => reactor.userId === currentUserId);

  useEffect(() => {
    if (!openPanel) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpenPanel(null);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenPanel(null);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openPanel]);

  const activeReactors = openPanel === "likes" ? likes : openPanel === "dislikes" ? dislikes : [];

  const togglePanel = (panel: "likes" | "dislikes") => (event: React.MouseEvent) => {
    event.stopPropagation();
    setOpenPanel((prev) => (prev === panel ? null : panel));
  };

  return (
    <div ref={rootRef} className="relative mt-3 flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => isSignedIn && onReact("LIKE")}
          disabled={!isSignedIn}
          title={isSignedIn ? t("comments.like") : t("comments.signInToReact")}
          aria-label={t("comments.like")}
          aria-pressed={iLiked}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${
            iLiked
              ? "border-transparent bg-linear-to-br from-[#4a00e0] to-[#8e2de2] text-white shadow-[0_4px_18px_-4px_rgba(142,45,226,0.7)]"
              : "border-foreground/10 bg-foreground/[0.03] text-foreground/60 enabled:hover:border-foreground/20 enabled:hover:bg-foreground/10 enabled:hover:text-foreground"
          }`}
        >
          <ThumbsUp size={14} />
          <span>{likes.length}</span>
        </button>

        {likes.length > 0 && (
          <button
            type="button"
            onClick={togglePanel("likes")}
            aria-label={t("comments.likedBy")}
            aria-expanded={openPanel === "likes"}
            className="flex items-center gap-1 rounded-full border border-foreground/10 bg-foreground/[0.03] py-1 pr-2 pl-1 transition-colors duration-200 hover:border-foreground/20 hover:bg-foreground/10"
          >
            <ReactorAvatar reactor={likes[0]} size={20} />
            <MoreHorizontal size={14} className="text-foreground/50" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => isSignedIn && onReact("DISLIKE")}
          disabled={!isSignedIn}
          title={isSignedIn ? t("comments.dislike") : t("comments.signInToReact")}
          aria-label={t("comments.dislike")}
          aria-pressed={iDisliked}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${
            iDisliked
              ? "border-transparent bg-rose-500/90 text-white shadow-[0_4px_18px_-4px_rgba(244,63,94,0.6)]"
              : "border-foreground/10 bg-foreground/[0.03] text-foreground/60 enabled:hover:border-foreground/20 enabled:hover:bg-foreground/10 enabled:hover:text-foreground"
          }`}
        >
          <ThumbsDown size={14} />
          <span>{dislikes.length}</span>
        </button>

        {dislikes.length > 0 && (
          <button
            type="button"
            onClick={togglePanel("dislikes")}
            aria-label={t("comments.dislikedBy")}
            aria-expanded={openPanel === "dislikes"}
            className="flex items-center gap-1 rounded-full border border-foreground/10 bg-foreground/[0.03] py-1 pr-2 pl-1 transition-colors duration-200 hover:border-foreground/20 hover:bg-foreground/10"
          >
            <ReactorAvatar reactor={dislikes[0]} size={20} />
            <MoreHorizontal size={14} className="text-foreground/50" />
          </button>
        )}
      </div>

      <div
        className={`absolute top-full left-0 z-20 mt-2 w-64 origin-top-left overflow-hidden rounded-2xl border border-foreground/10 bg-surface shadow-[0_20px_50px_-12px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-all duration-200 ${
          openPanel ? "pointer-events-auto scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
        }`}
      >
        <div className="flex items-center justify-between border-b border-foreground/10 px-3.5 py-2.5">
          <span className="text-xs font-semibold tracking-wide text-foreground/70 uppercase">
            {openPanel === "dislikes" ? t("comments.dislikedBy") : t("comments.likedBy")}
          </span>
          <button
            type="button"
            onClick={() => setOpenPanel(null)}
            aria-label={t("comments.close")}
            className="flex h-6 w-6 items-center justify-center rounded-full text-foreground/40 transition-colors hover:bg-foreground/10 hover:text-foreground"
          >
            <X size={13} />
          </button>
        </div>

        {activeReactors.length === 0 ? (
          <p className="px-3.5 py-4 text-center text-xs text-foreground/40">{t("comments.noReactionsYet")}</p>
        ) : (
          <ul className="max-h-56 overflow-y-auto py-1">
            {activeReactors.map((reactor) => (
              <ReactorRow key={reactor.userId} reactor={reactor} locale={locale} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
