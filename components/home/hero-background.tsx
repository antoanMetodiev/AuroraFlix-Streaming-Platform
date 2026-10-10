"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import YouTube, { type YouTubeEvent, type YouTubePlayer } from "react-youtube";
import { tmdbImage } from "@/lib/tmdb";
import { SHIMMER_BLUR_DATA_URL } from "@/lib/shimmer";
import { useProgressiveImage } from "@/lib/use-progressive-image";
import type { HeroItem } from "@/components/home/hero-item";

function extractYouTubeId(url?: string | null) {
    if (!url) return "";
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([\w-]+)/);
    return match ? match[1] : "";
}

/** How often the trailer's playback position is reported to the parent. */
const PROGRESS_POLL_MS = 250;

/**
 * Runs one call against the YouTube player, swallowing what it throws.
 * The player's methods throw outright once its iframe is gone (e.g. a call
 * landing just as this trailer is swapped for the next one — seen as
 * "Cannot read properties of null (reading 'src')" from mute()), and from
 * inside an effect that would take the whole homepage down with it.
 */
function withPlayer<T>(player: YouTubePlayer | null, call: (player: YouTubePlayer) => T): T | undefined {
    if (!player) return undefined;
    try {
        return call(player);
    } catch {
        return undefined;
    }
}

export function HeroBackground({
    record,
    muted,
    volume,
    onEnded,
    onReady,
    onProgress,
}: {
    record: HeroItem["record"];
    muted: boolean;
    /** 0–100, applied while unmuted (YouTube's own scale). */
    volume: number;
    onEnded: () => void;
    // Fires once the player has actually started (after the same delay
    // videoReady itself uses) — lets the parent's mute/unmute button stay
    // disabled until there's a real player to mute/unmute, instead of
    // queuing a toggle against a not-yet-ready (or still-buffering) iframe.
    onReady?: () => void;
    /** 0–1 share of the trailer played so far, every PROGRESS_POLL_MS. */
    onProgress?: (fraction: number) => void;
}) {
    const videoId = extractYouTubeId(record.trailerVideoURL);
    const playerRef = useRef<YouTubePlayer | null>(null);
    const [videoReady, setVideoReady] = useState(false);

    // Latest callbacks, read from the timers below without restarting them
    // every time the parent re-renders with new function identities.
    const onReadyRef = useRef(onReady);
    const onProgressRef = useRef(onProgress);
    useEffect(() => {
        onReadyRef.current = onReady;
        onProgressRef.current = onProgress;
    }, [onReady, onProgress]);

    // The reveal timer from onReady below — cleared on unmount so it can't
    // fire into a trailer that's already been swapped out.
    const revealTimerRef = useRef<number | undefined>(undefined);
    useEffect(() => {
        return () => {
            window.clearTimeout(revealTimerRef.current);
            playerRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (!videoReady) return;
        withPlayer(playerRef.current, (player) => {
            if (muted) {
                player.mute();
            } else {
                player.unMute();
                // Several mobile browsers (iOS Safari in particular) pause
                // playback as a side effect of unMute() on an iframe that
                // autoplayed muted, instead of just unmuting it — nudge it back
                // into play to counteract that instead of leaving it paused.
                player.playVideo();
            }
        });
    }, [muted, videoReady]);

    // Kept apart from the mute effect above so dragging the volume doesn't
    // re-run its playVideo() nudge on every step. (iOS ignores setVolume —
    // volume there is the hardware buttons' — so the parent only offers the
    // slider on mouse/trackpad devices.)
    useEffect(() => {
        if (!videoReady) return;
        withPlayer(playerRef.current, (player) => player.setVolume(volume));
    }, [volume, videoReady]);

    useEffect(() => {
        if (!videoReady) return;
        const timer = window.setInterval(() => {
            const fraction = withPlayer(playerRef.current, (player) => {
                const duration = Number(player.getDuration());
                const current = Number(player.getCurrentTime());
                return duration > 0 && Number.isFinite(current) ? Math.min(current / duration, 1) : undefined;
            });
            if (fraction !== undefined) onProgressRef.current?.(fraction);
        }, PROGRESS_POLL_MS);
        return () => window.clearInterval(timer);
    }, [videoReady]);

    // Same background-preload-then-swap strategy as the movie/series details
    // header and the image lightbox: paint the fast w1280 render immediately,
    // then quietly upgrade to the full-res backdrop once it's done loading —
    // all while this same image is fading out into the trailer once it's ready.
    const { src: backgroundSrc, isHighRes } = useProgressiveImage(
        tmdbImage(record.backgroundImg_URL, "w1280"),
        tmdbImage(record.backgroundImg_URL, "original")
    );

    return (
        // Remounted per title (keyed by the parent), so this fade plays on every switch.
        <div className="animate-hero-bg-in absolute inset-0 -z-10 overflow-hidden bg-black">
            {backgroundSrc && (
                <Image
                    key={backgroundSrc}
                    src={backgroundSrc}
                    alt=""
                    fill
                    unoptimized={isHighRes}
                    priority={!isHighRes}
                    loading="eager"
                    placeholder="blur"
                    blurDataURL={SHIMMER_BLUR_DATA_URL}
                    sizes="100vw"
                    className={videoReady ? "object-cover opacity-0" : "object-cover opacity-100"}
                />
            )}

            <div className="absolute inset-0 z-10 bg-black/50" />

            {videoId && (
                <div
                    className={`pointer-events-none absolute inset-0 overflow-hidden ${videoReady ? "opacity-100" : "opacity-0"
                        } [&_iframe]:absolute [&_iframe]:top-1/2 [&_iframe]:left-1/2 [&_iframe]:w-screen [&_iframe]:h-[56.25vw] [&_iframe]:min-h-full [&_iframe]:min-w-[177.78vh] [&_iframe]:-translate-x-1/2 [&_iframe]:-translate-y-1/2`}
                >
                    <YouTube
                        videoId={videoId}
                        className="h-full w-full"
                        opts={{
                            width: "100%",
                            height: "100%",
                            playerVars: {
                                autoplay: 1,
                                controls: 0,
                                mute: 1,
                                loop: 0,
                                playlist: videoId,
                                modestbranding: 1,
                                playsinline: 1,
                            },
                        }}
                        onReady={(event: YouTubeEvent) => {
                            playerRef.current = event.target;

                            // The `mute=1` playerVar is undocumented and not reliably honored,
                            // so mute explicitly as soon as the player exists.
                            if (muted) withPlayer(event.target, (player) => player.mute());

                            // Reveal the video first — nothing below this line may throw and
                            // block the fade-in (quality-level APIs are effectively deprecated
                            // by YouTube and can hang or reject).
                            revealTimerRef.current = window.setTimeout(() => {
                                setVideoReady(true);
                                onReadyRef.current?.();
                            }, 1200);
                        }}
                        onEnd={onEnded}
                    />
                </div>
            )}
        </div>
    );
}
