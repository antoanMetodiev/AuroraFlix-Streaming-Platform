"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { MessageCircle, Pencil, Send, Trash2, X } from "lucide-react";
import { CommentReactionsBar } from "@/components/movies/details/comment-reactions-bar";
import { SectionHeading } from "@/components/movies/details/section-heading";
import { Spinner } from "@/components/ui/loader";
import { formatDateTime } from "@/lib/dates";
import { useTranslation } from "@/lib/i18n/locale-context";
import type { Comment, CommentReactions } from "@/types/comment";

const PAGE_SIZE = 10;

export function CommentsSection({ recordId, type }: { recordId: string; type: "movie" | "series" }) {
  const { t, locale } = useTranslation();
  const { isLoaded, isSignedIn, user } = useUser();

  const [comments, setComments] = useState<Comment[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [draft, setDraft] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [postError, setPostError] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [reactions, setReactions] = useState<Record<string, CommentReactions>>({});

  const commentsPath = type === "series" ? "get-next-10-series-comments" : "get-next-10-movie-comments";
  const reactionsPath = type === "series" ? "get-series-comments-reactions" : "get-movie-comments-reactions";

  const loadPage = async (pageToLoad: number) => {
    const response = await fetch(
      `/api/backend/${commentsPath}?order=${pageToLoad}&currentCinemaRecordId=${encodeURIComponent(recordId)}`,
      { cache: "no-store" }
    );
    if (!response.ok) return [] as Comment[];
    const data = (await response.json()) as Comment[];
    return Array.isArray(data) ? data : [];
  };

  // Reads are batched (one request for a whole page of comments) rather than
  // one request per comment — the backend has no cache-invalidation hooks
  // either way, so this is fetched fresh on every page load, same as comments.
  const loadReactions = async (commentIds: string[]) => {
    if (commentIds.length === 0) return {} as Record<string, CommentReactions>;

    const response = await fetch(
      `/api/backend/${reactionsPath}?commentIds=${encodeURIComponent(commentIds.join(","))}`,
      { cache: "no-store" }
    );
    if (!response.ok) return {} as Record<string, CommentReactions>;
    const data = await response.json();
    return data && typeof data === "object" ? (data as Record<string, CommentReactions>) : {};
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      const data = await loadPage(1);
      if (cancelled) return;
      setComments(data);
      setHasMore(data.length === PAGE_SIZE);
      setPage(1);
      setIsLoading(false);

      const freshReactions = await loadReactions(data.map((comment) => comment.id));
      if (!cancelled) setReactions(freshReactions);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordId, type]);

  const loadMore = async () => {
    setIsLoadingMore(true);
    const nextPage = page + 1;
    const data = await loadPage(nextPage);
    setComments((prev) => [...prev, ...data]);
    setHasMore(data.length === PAGE_SIZE);
    setPage(nextPage);
    setIsLoadingMore(false);

    const freshReactions = await loadReactions(data.map((comment) => comment.id));
    setReactions((prev) => ({ ...prev, ...freshReactions }));
  };

  const reactToComment = async (commentId: string, reactionType: "LIKE" | "DISLIKE") => {
    if (!user) return;

    const me = {
      userId: user.id,
      username: user.username ?? "",
      fullName: user.fullName ?? "",
      imgURL: user.imageUrl ?? null,
      createdAt: new Date().toISOString(),
    };

    // Optimistic toggle, mirroring the backend's own toggle logic (same
    // button again -> un-react, the other button -> switch) so the UI
    // updates instantly instead of waiting on the round trip.
    const previous = reactions[commentId] ?? { likes: [], dislikes: [] };
    const alreadyLiked = previous.likes.some((reactor) => reactor.userId === me.userId);
    const alreadyDisliked = previous.dislikes.some((reactor) => reactor.userId === me.userId);
    const likes = previous.likes.filter((reactor) => reactor.userId !== me.userId);
    const dislikes = previous.dislikes.filter((reactor) => reactor.userId !== me.userId);

    const isTogglingOff = (reactionType === "LIKE" && alreadyLiked) || (reactionType === "DISLIKE" && alreadyDisliked);
    if (!isTogglingOff) {
      if (reactionType === "LIKE") likes.push(me);
      else dislikes.push(me);
    }

    setReactions((prev) => ({ ...prev, [commentId]: { likes, dislikes } }));

    try {
      const response = await fetch(`/api/comments/${commentId}/react`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, reactionType }),
      });
      if (!response.ok) throw new Error("failed");
    } catch {
      setReactions((prev) => ({ ...prev, [commentId]: previous }));
    }
  };

  const submitComment = async (event: React.FormEvent) => {
    event.preventDefault();
    const commentText = draft.trim();
    if (!commentText || isPosting) return;

    setIsPosting(true);
    setPostError(false);

    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, recordId, commentText }),
      });
      if (!response.ok) throw new Error("failed");

      setDraft("");
      // Freshest copy from the server rather than guessing our own shape —
      // lets the real id/displayName/avatar show up immediately.
      const refreshed = await loadPage(1);
      setComments(refreshed);
      setHasMore(refreshed.length === PAGE_SIZE);
      setPage(1);

      const freshReactions = await loadReactions(refreshed.map((comment) => comment.id));
      setReactions(freshReactions);
    } catch {
      setPostError(true);
    } finally {
      setIsPosting(false);
    }
  };

  const startEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setEditDraft(comment.commentText);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft("");
  };

  const saveEdit = async (commentId: string) => {
    const commentText = editDraft.trim();
    if (!commentText || isSavingEdit) return;

    setIsSavingEdit(true);
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, recordId, commentText }),
      });
      if (!response.ok) throw new Error("failed");

      setComments((prev) => prev.map((comment) => (comment.id === commentId ? { ...comment, commentText } : comment)));
      setEditingId(null);
      setEditDraft("");
    } catch {
      // Leave edit mode open with the draft intact so nothing typed is lost.
    } finally {
      setIsSavingEdit(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    if (deletingId) return;
    setDeletingId(commentId);

    try {
      const query = new URLSearchParams({ type, recordId }).toString();
      const response = await fetch(`/api/comments/${commentId}?${query}`, { method: "DELETE" });
      if (!response.ok) throw new Error("failed");

      setComments((prev) => prev.filter((comment) => comment.id !== commentId));
      setReactions((prev) => {
        const next = { ...prev };
        delete next[commentId];
        return next;
      });
    } catch {
      // Swallow — comment stays visible, user can just try again.
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="mx-auto max-w-[100rem] px-4 pt-4 pb-16 sm:px-6 sm:pb-24">
      <SectionHeading>
        <span className="inline-flex items-center gap-2">
          <MessageCircle size={20} className="text-foreground/60" />
          {t("comments.title")}
        </span>
      </SectionHeading>

      <div className="mx-auto max-w-3xl">
        {isLoaded && isSignedIn ? (
          <form onSubmit={submitComment} className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-start">
            {user?.imageUrl && (
              <Image
                src={user.imageUrl}
                alt=""
                width={40}
                height={40}
                loading="eager"
                className="hidden h-10 w-10 shrink-0 rounded-full object-cover sm:block"
              />
            )}
            <div className="flex-1">
              <div className="relative">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  disabled={isPosting}
                  placeholder={t("comments.placeholder")}
                  rows={3}
                  className="w-full resize-none rounded-2xl border border-foreground/15 bg-foreground/[0.06] p-4 pr-14 text-sm text-foreground placeholder:text-foreground/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl transition-all duration-300 outline-none focus:border-transparent focus:bg-foreground/[0.1] focus:shadow-[0_0_0_1.5px_#8e2de2,0_8px_28px_-6px_rgba(142,45,226,0.55)] disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isPosting || !draft.trim()}
                  aria-label={t("comments.submitAria")}
                  className="absolute right-3 bottom-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-[#4a00e0] to-[#8e2de2] text-white transition-transform duration-200 enabled:hover:scale-108 disabled:opacity-40"
                >
                  {isPosting ? <Spinner size={16} /> : <Send size={16} />}
                </button>
              </div>
              {postError && <p className="mt-2 text-xs text-red-400">{t("comments.postError")}</p>}
            </div>
          </form>
        ) : (
          isLoaded && (
            <div className="mb-8 rounded-2xl border border-foreground/10 bg-foreground/[0.04] p-5 text-center">
              <p className="text-sm text-foreground/60">
                <Link href="/sign-in" className="font-semibold text-foreground underline underline-offset-4 hover:text-foreground/80">
                  {t("comments.signInCta")}
                </Link>{" "}
                {t("comments.signInToComment")}
              </p>
            </div>
          )
        )}

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner size={28} />
          </div>
        ) : comments.length === 0 ? (
          <p className="py-6 text-center text-sm text-foreground/40">{t("comments.empty")}</p>
        ) : (
          <ul className="flex flex-col gap-5">
            {comments.map((comment) => {
              const isOwn = isSignedIn && user?.id === comment.authorId;
              const isEditing = editingId === comment.id;

              return (
                <li key={comment.id} className="flex gap-3">
                  {comment.authorImgURL ? (
                    <Image
                      src={comment.authorImgURL}
                      alt=""
                      width={40}
                      height={40}
                      loading="eager"
                      className="h-10 w-10 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-sm font-semibold text-foreground/70">
                      {(comment.authorFullName || comment.authorUsername || "?").charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0 flex-1 rounded-2xl border border-foreground/10 bg-foreground/[0.04] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          {comment.authorFullName || comment.authorUsername}
                        </span>
                        <span className="text-xs text-foreground/40">{formatDateTime(comment.createdAt, locale)}</span>
                      </div>

                      {isOwn && !isEditing && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(comment)}
                            aria-label={t("comments.edit")}
                            className="flex h-7 w-7 items-center justify-center rounded-full text-foreground/40 transition-colors hover:bg-foreground/10 hover:text-foreground"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteComment(comment.id)}
                            disabled={deletingId === comment.id}
                            aria-label={t("comments.delete")}
                            className="flex h-7 w-7 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-red-500/20 hover:text-red-300 disabled:opacity-40"
                          >
                            {deletingId === comment.id ? <Spinner size={14} /> : <Trash2 size={14} />}
                          </button>
                        </div>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="mt-2">
                        <textarea
                          value={editDraft}
                          onChange={(event) => setEditDraft(event.target.value)}
                          disabled={isSavingEdit}
                          rows={2}
                          className="w-full resize-none rounded-xl border border-foreground/15 bg-foreground/[0.06] p-3 text-sm text-foreground outline-none focus:border-transparent focus:shadow-[0_0_0_1.5px_#8e2de2]"
                        />
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => saveEdit(comment.id)}
                            disabled={isSavingEdit || !editDraft.trim()}
                            className="rounded-full bg-linear-to-br from-[#4a00e0] to-[#8e2de2] px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                          >
                            {isSavingEdit ? <Spinner size={12} /> : t("comments.save")}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            disabled={isSavingEdit}
                            className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-foreground/60 hover:text-foreground"
                          >
                            <X size={13} />
                            {t("comments.cancel")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="mt-1.5 text-sm leading-relaxed break-words text-foreground/75">{comment.commentText}</p>
                        <CommentReactionsBar
                          reactions={reactions[comment.id]}
                          isSignedIn={!!isSignedIn}
                          currentUserId={user?.id}
                          onReact={(reactionType) => reactToComment(comment.id, reactionType)}
                        />
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {hasMore && !isLoading && (
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={loadMore}
              disabled={isLoadingMore}
              className="rounded-full border border-foreground/15 bg-foreground/[0.04] px-6 py-2.5 text-sm font-semibold text-foreground/80 transition-colors hover:bg-foreground/10 disabled:opacity-50"
            >
              {isLoadingMore ? <Spinner size={16} /> : t("sections.loadMore")}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
