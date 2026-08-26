"use client";

import { useState } from "react";
import { Check, ListVideo, Plus, X } from "lucide-react";
import { Footer } from "@/components/layout/footer";
import { Loader } from "@/components/ui/loader";
import { PlaylistCard, VisibilityToggle } from "@/components/playlists/playlist-card";
import { usePlaylists } from "@/lib/use-playlists";
import { useTranslation } from "@/lib/i18n/locale-context";

export function PlaylistsView() {
  const { t } = useTranslation();
  const { playlists, isLoading, create, update, remove } = usePlaylists();
  const [isCreating, setIsCreating] = useState(false);

  return (
    <div className="relative min-h-screen w-full bg-background">
      <div className="mx-auto max-w-4xl px-4 pt-8 pb-16 sm:px-6 sm:pt-14 lg:px-8">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4 sm:mb-10">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl">{t("playlists.title")}</h1>
              {playlists.length > 0 && (
                <span className="rounded-full border border-foreground/15 bg-foreground/10 px-3 py-1 text-xs font-semibold text-foreground/70 backdrop-blur-md">
                  {playlists.length}
                </span>
              )}
            </div>
            <p className="mt-2 max-w-md text-sm text-foreground/50">{t("playlists.subtitle")}</p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreating((prev) => !prev)}
            className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-200 ${
              isCreating ? "border border-foreground/15 text-foreground/70 hover:bg-foreground/10" : "bg-white text-neutral-900 shadow-[0_8px_20px_-4px_rgba(255,255,255,0.4)] hover:-translate-y-0.5"
            }`}
          >
            {isCreating ? <X size={16} /> : <Plus size={16} />}
            {t("playlists.new")}
          </button>
        </div>

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
          <div className="flex min-h-[30vh] flex-col items-center justify-center gap-3 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-foreground/5 text-foreground/30">
              <ListVideo size={24} />
            </span>
            <h2 className="text-xl font-semibold text-foreground">{t("playlists.emptyTitle")}</h2>
            <p className="max-w-sm text-sm text-foreground/50">{t("playlists.emptyDesc")}</p>
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="mt-3 flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-neutral-900 shadow-[0_8px_20px_-4px_rgba(255,255,255,0.4)] transition-transform duration-200 hover:-translate-y-0.5"
            >
              <Plus size={16} />
              {t("playlists.new")}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {playlists.map((playlist, index) => (
              <div key={playlist.id} className="animate-card-in" style={{ animationDelay: `${Math.min(index, 10) * 40}ms`, animationDuration: "0.4s" }}>
                <PlaylistCard playlist={playlist} canManage onSave={update} onDelete={remove} />
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
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
    <div className="relative flex flex-col gap-3 overflow-hidden rounded-3xl border border-foreground/10 bg-surface px-5 py-5 sm:flex-row sm:items-center sm:px-6">
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
