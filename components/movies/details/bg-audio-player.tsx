"use client";

import { useEffect, useRef, useState } from "react";
import { AudioLines } from "lucide-react";
import { Spinner } from "@/components/ui/loader";
import { useTranslation } from "@/lib/i18n/locale-context";

type AudioTrackOption = {
  index: number;
  lang: string;
  name: string;
};

/**
 * Our own player for the movie's Bulgarian-dubbed stream (ZenoPlay's VidHide
 * HLS, see lib/movie-bg-audio.ts) — a plain <video>, so no ads, no pop-ups
 * and the browser's own fullscreen.
 *
 * hls.js plays it wherever Media Source Extensions exist; iPhone Safari has
 * none but plays HLS natively. The Bulgarian rendition is the playlist's
 * default and is picked explicitly as well; when the stream has more than
 * one, small buttons switch between them. Our Bulgarian subtitles, if we
 * have them, are a captions track that's off by default (it's a dub).
 */
export function BgAudioPlayer({
  masterUrl,
  subtitleUrl,
  title,
  onFailed,
}: {
  masterUrl: string;
  subtitleUrl?: string;
  title?: string;
  /** The stream couldn't be played — the parent moves on to another player. */
  onFailed: () => void;
}) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [tracks, setTracks] = useState<AudioTrackOption[]>([]);
  const [activeTrack, setActiveTrack] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const switchTrackRef = useRef<(index: number) => void>(() => {});
  const onFailedRef = useRef(onFailed);

  useEffect(() => {
    onFailedRef.current = onFailed;
  }, [onFailed]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let destroyed = false;
    let destroy = () => {};

    const showPlaying = () => setLoading(false);
    video.addEventListener("playing", showPlaying);
    video.addEventListener("loadeddata", showPlaying);

    void import("hls.js").then(({ default: Hls }) => {
      if (destroyed) return;

      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true });
        let fatalErrors = 0;

        const syncTracks = () => {
          const options = hls.audioTracks.map((track, index) => ({
            index,
            lang: (track.lang ?? "").toLowerCase(),
            name: track.name ?? "",
          }));
          setTracks(options);
          setActiveTrack(hls.audioTrack);
        };

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          const bg = hls.audioTracks.findIndex((track) => /^(bg|bul)/i.test(track.lang ?? "") || /българ/i.test(track.name ?? ""));
          if (bg >= 0 && hls.audioTrack !== bg) hls.audioTrack = bg;
          syncTracks();
          void video.play().catch(() => {
            // Autoplay with sound blocked — the controls are there.
          });
        });
        hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, syncTracks);
        hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, syncTracks);
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal) return;
          fatalErrors++;
          // One retry for a dropped connection; anything else gives up.
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR && fatalErrors === 1) {
            hls.startLoad();
            return;
          }
          if (data.type === Hls.ErrorTypes.MEDIA_ERROR && fatalErrors === 1) {
            hls.recoverMediaError();
            return;
          }
          onFailedRef.current();
        });

        switchTrackRef.current = (index) => {
          hls.audioTrack = index;
        };

        hls.loadSource(masterUrl);
        hls.attachMedia(video);
        destroy = () => hls.destroy();
        return;
      }

      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Native HLS (iPhone): the playlist's DEFAULT=YES rendition — the
        // Bulgarian one — plays; switching is in the system player's menu.
        video.src = masterUrl;
        const onError = () => onFailedRef.current();
        video.addEventListener("error", onError);
        destroy = () => {
          video.removeEventListener("error", onError);
          video.removeAttribute("src");
          video.load();
        };
        void video.play().catch(() => {});
        return;
      }

      onFailedRef.current();
    });

    return () => {
      destroyed = true;
      video.removeEventListener("playing", showPlaying);
      video.removeEventListener("loadeddata", showPlaying);
      destroy();
    };
  }, [masterUrl]);

  return (
    <>
      <video
        ref={videoRef}
        className="h-full w-full bg-black"
        controls
        playsInline
        preload="auto"
        crossOrigin="anonymous"
        title={title}
      >
        {subtitleUrl && <track kind="subtitles" srcLang="bg" label="Български" src={subtitleUrl} />}
      </video>

      {loading && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black">
          <Spinner size={44} />
        </div>
      )}

      {tracks.length > 1 && (
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1 rounded-full border border-white/15 bg-black/60 p-1 backdrop-blur-md">
          <AudioLines size={15} className="mx-1.5 text-white/70" aria-hidden />
          {tracks.map((track) => {
            const isActive = track.index === activeTrack;
            const label = /^(bg|bul)/.test(track.lang) ? "БГ" : track.lang ? track.lang.slice(0, 2).toUpperCase() : track.name;
            return (
              <button
                key={track.index}
                type="button"
                aria-pressed={isActive}
                title={`${t("player.audioTrack")}: ${track.name || label}`}
                onClick={() => switchTrackRef.current(track.index)}
                className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                  isActive ? "bg-white text-neutral-900" : "text-white/80 hover:bg-white/15 hover:text-white"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
