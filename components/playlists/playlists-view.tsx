"use client";

import { useState } from "react";
import { Check, Film, Globe, ListVideo, Plus, X } from "lucide-react";
import { Loader } from "@/components/ui/loader";
import { LibraryHero, type LibraryStat } from "@/components/library/library-hero";
import { PlaylistCard, VisibilityToggle } from "@/components/playlists/playlist-card";
import { usePlaylists } from "@/lib/use-playlists";
import { tmdbImage } from "@/lib/tmdb";
import { useTranslation } from "@/lib/i18n/locale-context";

export function PlaylistsView() {
  const { t } = useTranslation();
  const { playlists, isLoading, create, update, remove } = usePlaylists();
  const [isCreating, setIsCreating] = useState(false);
  // The first playlist's first poster, reported by its card once its titles load.
  const [coverPoster, setCoverPoster] = useState<string | null>(null);

  const stats: LibraryStat[] =
    playlists.length > 0
      ? [
          { Icon: ListVideo, label: t("playlists.statPlaylists"), value: String(playlists.length) },
          { Icon: Globe, label: t("playlists.statPublic"), value: String(playlists.filter((playlist) => playlist.isPublic).length) },
          { Icon: Film, label: t("playlists.statTitles"), value: String(playlists.reduce((sum, playlist) => sum + playlist.itemCount, 0)) },
        ]
      : [];

  return (
    <div className="relative flex-1 w-full overflow-x-hidden">
      <div className="mx-auto max-w-6xl px-4 pt-10 pb-20 sm:px-6 sm:pt-14 lg:px-8 lg:pt-16">
        <LibraryHero
          title={t("playlists.title")}
          subtitle={t("playlists.subtitle")}
          stats={stats}
          backdropPoster={playlists.length > 0 && coverPoster ? tmdbImage(coverPoster, "w780") : null}
          action={
            <button
              type="button"
              onClick={() => setIsCreating((prev) => !prev)}
              className={`flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-all duration-300 ${
                isCreating
                  ? "border border-white/15 bg-white/[0.05] text-foreground/75 backdrop-blur-sm hover:bg-white/10"
                  : "bg-white text-neutral-900 shadow-[0_10px_28px_-6px_rgba(255,255,255,0.5)] hover:-translate-y-0.5 hover:shadow-[0_14px_34px_-6px_rgba(255,255,255,0.6)]"
              }`}
            >
              {isCreating ? <X size={16} /> : <Plus size={16} />}
              {t("playlists.new")}
            </button>
          }
        />

        {isCreating && (
          <div className="animate-card-in mb-8" style={{ animationDuration: "0.3s" }}>
            <CreateForm
              onCancel={() => setIsCreating(false)}
              onCreate={async (name, isPublic) => {
                const created = await create(name, isPublic);
                if (created) setIsCreating(false);
                return created !== null;
              }}
            />
          </div>
        )}

        {isLoading ? (
          <Loader />
        ) : playlists.length === 0 && !isCreating ? (
          <div className="animate-card-in relative mx-auto flex max-w-xl flex-col items-center overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-transparent px-6 py-14 text-center">
            <span aria-hidden className="absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
            <span className="relative flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-neutral-900 shadow-[0_10px_30px_-8px_rgba(255,255,255,0.55)]">
              <ListVideo size={26} />
            </span>
            <h2 className="relative mt-3 font-display text-2xl font-semibold text-foreground sm:text-3xl">{t("playlists.emptyTitle")}</h2>
            <p className="relative max-w-sm text-sm text-foreground/55">{t("playlists.emptyDesc")}</p>
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="relative mt-4 flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-neutral-900 shadow-[0_8px_20px_-4px_rgba(255,255,255,0.4)] transition-transform duration-200 hover:-translate-y-0.5"
            >
              <Plus size={16} />
              {t("playlists.new")}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {playlists.map((playlist, index) => (
              <div key={playlist.id} className="animate-card-in" style={{ animationDelay: `${Math.min(index, 10) * 40}ms`, animationDuration: "0.4s" }}>
                <PlaylistCard
                  playlist={playlist}
                  canManage
                  onSave={update}
                  onDelete={remove}
                  onCoverPoster={index === 0 ? setCoverPoster : undefined}
                />
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

function CreateForm({
  onCreate,
  onCancel,
}: {
  onCreate: (name: string, isPublic: boolean) => Promise<boolean>;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    await onCreate(name.trim(), isPublic);
    setIsSaving(false);
  };

  return (
    <div className="relative flex flex-col gap-3 overflow-hidden rounded-[2rem] border border-white/15 bg-white/[0.05] px-5 py-5 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.8)] backdrop-blur-md sm:flex-row sm:items-center sm:px-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/[0.06] to-transparent" />
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => event.key === "Enter" && handleCreate()}
        placeholder={t("playlists.namePlaceholder")}
        autoComplete="off"
        autoFocus
        className="relative min-w-0 flex-1 rounded-full border border-foreground/15 bg-foreground/[0.06] px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/35 outline-none transition-all duration-300 focus:border-transparent focus:bg-foreground/[0.1] focus:shadow-[0_0_0_1.5px_#ffffff]"
      />
      <div className="relative flex shrink-0 items-center gap-2">
        <VisibilityToggle value={isPublic} onChange={setIsPublic} />
        <button
          type="button"
          onClick={onCancel}
          aria-label={t("playlists.cancel")}
          title={t("playlists.cancel")}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-foreground/15 text-foreground/60 transition-all duration-200 hover:scale-105 hover:bg-foreground/10 hover:text-foreground"
        >
          <X size={15} />
        </button>
        <button
          type="button"
          onClick={handleCreate}
          disabled={isSaving || !name.trim()}
          aria-label={t("playlists.create")}
          title={t("playlists.create")}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-neutral-900 transition-transform duration-200 hover:scale-105 disabled:pointer-events-none disabled:opacity-50"
        >
          <Check size={15} />
        </button>
      </div>
    </div>
  );
}
