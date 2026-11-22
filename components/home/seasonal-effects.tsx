"use client";

import { useEffect, useRef, useState } from "react";
import { activeSeason, readSeasonalFx, SEASONAL_FX_EVENT, type Season } from "@/lib/seasons";

/**
 * Light, ambient particles over the homepage for the current season — snow
 * in winter, embers for Halloween, hearts around Valentine's. One canvas,
 * pointer-events off, a few dozen particles, paused while the tab is hidden.
 * Nothing at all with reduced motion or when the viewer switched it off
 * (SeasonalToggle). The season is worked out here in the browser, from the
 * viewer's own date, so a cached page never shows last month's theme.
 */
export function SeasonalEffects() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [{ season, enabled }, setState] = useState<{ season: Season | null; enabled: boolean }>({ season: null, enabled: false });

  useEffect(() => {
    const override = new URLSearchParams(window.location.search).get("season");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the date and storage only exist in the browser
    setState({ season: activeSeason(new Date(), override), enabled: !reduced && readSeasonalFx() });
    const onChange = (event: Event) =>
      setState((prev) => ({ ...prev, enabled: !reduced && Boolean((event as CustomEvent<boolean>).detail) }));
    window.addEventListener(SEASONAL_FX_EVENT, onChange);
    return () => window.removeEventListener(SEASONAL_FX_EVENT, onChange);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !season || !enabled) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const count = Math.round(Math.min(70, Math.max(24, width / 22)) * (season === "winter" ? 1 : 0.45));
    const particles = Array.from({ length: count }, () => spawn(width, height, true));

    function spawn(w: number, h: number, anywhere: boolean) {
      const size = season === "winter" ? 1 + Math.random() * 2.6 : 6 + Math.random() * 8;
      return {
        x: Math.random() * w,
        y: anywhere ? Math.random() * h : season === "halloween" ? h + 10 : -10,
        size,
        speed: (season === "winter" ? 0.35 : 0.25) + Math.random() * 0.6,
        drift: Math.random() * Math.PI * 2,
        alpha: 0.35 + Math.random() * 0.5,
      };
    }

    let frame = 0;
    let last = performance.now();
    const draw = (now: number) => {
      const dt = Math.min(3, (now - last) / 16.7);
      last = now;
      context.clearRect(0, 0, width, height);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.drift += 0.012 * dt;
        p.x += Math.sin(p.drift) * 0.35 * dt;
        // Embers rise, snow and hearts fall.
        p.y += (season === "halloween" ? -p.speed : p.speed) * dt;
        if (p.y > height + 12 || p.y < -12 || p.x < -12 || p.x > width + 12) particles[i] = spawn(width, height, false);
        context.globalAlpha = p.alpha;
        if (season === "winter") {
          context.fillStyle = "#ffffff";
          context.beginPath();
          context.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          context.fill();
        } else if (season === "halloween") {
          context.fillStyle = "#fb923c";
          context.shadowColor = "#f97316";
          context.shadowBlur = 8;
          context.beginPath();
          context.arc(p.x, p.y, p.size / 4, 0, Math.PI * 2);
          context.fill();
          context.shadowBlur = 0;
        } else {
          drawHeart(context, p.x, p.y, p.size);
        }
      }
      context.globalAlpha = 1;
      frame = requestAnimationFrame(draw);
    };

    const onVisibility = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden) {
        last = performance.now();
        frame = requestAnimationFrame(draw);
      }
    };
    frame = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      context.clearRect(0, 0, width, height);
    };
  }, [season, enabled]);

  if (!season || !enabled) return null;
  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 z-40 h-full w-full" />;
}

function drawHeart(context: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const s = size / 2;
  context.fillStyle = "#fb7185";
  context.beginPath();
  context.moveTo(x, y + s * 0.6);
  context.bezierCurveTo(x - s * 1.2, y - s * 0.2, x - s * 0.5, y - s * 1.1, x, y - s * 0.4);
  context.bezierCurveTo(x + s * 0.5, y - s * 1.1, x + s * 1.2, y - s * 0.2, x, y + s * 0.6);
  context.fill();
}
