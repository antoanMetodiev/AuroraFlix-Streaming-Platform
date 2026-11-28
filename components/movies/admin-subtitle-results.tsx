"use client";

import { useEffect, useState } from "react";
import { CinemaRecordGrid } from "@/components/movies/cinema-record-grid";
import { PaginationControls } from "@/components/movies/pagination-controls";
import { Loader } from "@/components/ui/loader";
import type { SeriesSourceCounts, SubtitleSourceFilter } from "@/lib/subtitle-source";
import type { Movie } from "@/types/movie";
import type { Series } from "@/types/series";

const KIND_TITLE: Record<SubtitleSourceFilter, string> = {
  machine: "Машинен превод",
  provider: "От доставчици",
  cam: "CAM превод",
};

type Response = {
  total: number;
  totalPages: number;
  records: (Movie | Series)[];
  sources: Record<string, string | SeriesSourceCounts>;
  missing: number;
};

/**
 * Admin only: the titles whose Bulgarian subtitles are of one kind (the
 * "🛠 Субтитри" filter), newest first, each with its source on the card.
 * /api/admin/subtitle-titles checks the caller; anyone else gets nothing.
 */
export function AdminSubtitleResults({ type, kind, page }: { type: "movie" | "series"; kind: SubtitleSourceFilter; page: number }) {
  const [state, setState] = useState<{ status: "loading" } | { status: "forbidden" } | { status: "error" } | { status: "ok"; data: Response }>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a new kind / page starts loading afresh
    setState({ status: "loading" });
    fetch(`/api/admin/subtitle-titles?type=${type}&kind=${kind}&page=${page}`, { cache: "no-store" })
      .then(async (response) => {
        if (cancelled) return;
        if (response.status === 403) return setState({ status: "forbidden" });
        if (!response.ok) return setState({ status: "error" });
        setState({ status: "ok", data: (await response.json()) as Response });
      })
      .catch(() => !cancelled && setState({ status: "error" }));
    return () => {
      cancelled = true;
    };
  }, [type, kind, page]);

  const listPath = type === "movie" ? "/movies" : "/series";

  return (
    <div className="relative">
      <div className="mx-auto max-w-[100rem] px-4 pt-6 pb-4 sm:px-6">
        <p className="inline-flex items-center gap-2 rounded-full border border-violet-300/30 bg-violet-500/15 px-3 py-1 text-xs font-bold tracking-wide text-violet-200 uppercase">
          🛠 Админ
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {type === "movie" ? "Филми" : "Сериали"} · {KIND_TITLE[kind]}
        </h1>
        {state.status === "ok" && (
          <p className="mt-1 text-sm text-foreground/55">
            {type === "movie" ? `${state.data.total} филма` : `${state.data.total} сериала с поне един такъв епизод`}
            {state.data.missing > 0 ? ` · ${state.data.missing} на тази страница ги няма в каталога` : ""}
          </p>
        )}
      </div>

      {state.status === "loading" && <Loader className="min-h-[40vh]" />}
      {state.status === "forbidden" && <p className="px-4 py-24 text-center text-foreground/55">Тази страница не е достъпна.</p>}
      {state.status === "error" && <p className="px-4 py-24 text-center text-foreground/55">Услугата за субтитри не отговори (може би се събужда). Опитай пак след малко.</p>}
      {state.status === "ok" && (
        <>
          <CinemaRecordGrid records={state.data.records} type={type} adminSources={state.data.sources} />
          <PaginationControls currentPage={page} totalPages={state.data.totalPages} basePath={listPath} extraQuery={`subs=${kind}`} />
        </>
      )}
    </div>
  );
}
