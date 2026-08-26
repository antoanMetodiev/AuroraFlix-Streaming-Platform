"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import YouTube, { type YouTubeEvent, type YouTubePlayer } from "react-youtube";
import { tmdbImage } from "@/lib/tmdb";
import { SHIMMER_BLUR_DATA_URL } from "@/lib/shimmer";
import { useProgressiveImage } from "@/lib/use-progressive-image";
import type { Movie } from "@/types/movie";

function extractYouTubeId(url?: string | null) {
    if (!url) return "";
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([\w-]+)/);
    return match ? match[1] : "";
}

export function HeroBackground({
    movie,
    muted,
    onEnded,
    onReady,
}: {
    movie: Movie;
    muted: boolean;
    onEnded: () => void;
    // Fires once the player has actually started (after the same delay
    // videoReady itself uses) — lets the parent's mute/unmute button stay
    // disabled until there's a real player to mute/unmute, instead of
    // queuing a toggle against a not-yet-ready (or still-buffering) iframe.
    onReady?: () => void;
}) {
    const videoId = extractYouTubeId(movie.trailerVideoURL);
    const playerRef = useRef<YouTubePlayer | null>(null);
    const [videoReady, setVideoReady] = useState(false);

    useEffect(() => {
        if (!playerRef.current || !videoReady) return;
        if (muted) {
            playerRef.current.mute();
        } else {
            playerRef.current.unMute();
            // Several mobile browsers (iOS Safari in particular) pause
            // playback as a side effect of unMute() on an iframe that
            // autoplayed muted, instead of just unmuting it — nudge it back
            // into play to counteract that instead of leaving it paused.
            playerRef.current.playVideo();
        }
    }, [muted, videoReady]);

    // Same background-preload-then-swap strategy as the movie/series details
    // header and the image lightbox: paint the fast w1280 render immediately,
    // then quietly upgrade to the full-res backdrop once it's done loading —
    // all while this same image is fading out into the trailer once it's ready.
    const { src: backgroundSrc, isHighRes } = useProgressiveImage(
        tmdbImage(movie.backgroundImg_URL, "w1280"),
        tmdbImage(movie.backgroundImg_URL, "original")
    );

    return (
        <div className="absolute inset-0 -z-10 overflow-hidden bg-black">
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
                    className={`object-cover transition-opacity duration-1000 ${videoReady ? "opacity-0" : "opacity-100"}`}
                />
            )}

            <div className="absolute inset-0 z-10 bg-black/50" />

            {videoId && (
                <div
                    className={`pointer-events-none absolute inset-0 overflow-hidden transition-opacity duration-1000 ${videoReady ? "opacity-100" : "opacity-0"
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
                            if (muted) event.target.mute();

                            // Reveal the video first — nothing below this line may throw and
                            // block the fade-in (quality-level APIs are effectively deprecated
                            // by YouTube and can hang or reject).
                            window.setTimeout(() => {
                                setVideoReady(true);
                                onReady?.();
                            }, 1200);
                        }}
                        onEnd={onEnded}
                    />
                </div>
            )}
        </div>
    );
}
