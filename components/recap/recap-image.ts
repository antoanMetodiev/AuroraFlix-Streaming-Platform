/**
 * Draws the weekly recap as a 1080×1920 story image (Instagram / WhatsApp
 * status size) for the Share button. Stills come from TMDB's CDN, which
 * allows cross-origin reads, so the canvas stays exportable; one that fails
 * to load is just left out.
 */
export async function renderRecapImage({
  range,
  heading,
  lines,
  images,
}: {
  range: string;
  heading: string;
  lines: string[];
  images: string[];
}): Promise<Blob | null> {
  const W = 1080;
  const H = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const loaded = (await Promise.all(images.map(loadImage))).filter((img): img is HTMLImageElement => img !== null);

  // Background: the top still, blurred and dimmed, under a violet/blue glow.
  ctx.fillStyle = "#050507";
  ctx.fillRect(0, 0, W, H);
  if (loaded[0]) {
    ctx.save();
    ctx.filter = "blur(60px) brightness(0.45)";
    drawCover(ctx, loaded[0], -100, -100, W + 200, H + 200);
    ctx.restore();
  }
  const glow = ctx.createRadialGradient(W * 0.25, H * 0.15, 0, W * 0.25, H * 0.15, W);
  glow.addColorStop(0, "rgba(167,139,250,0.35)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Up to three stills, stacked as tilted cards.
  loaded.slice(0, 3).forEach((img, i) => {
    ctx.save();
    ctx.translate(W / 2 + (i - 1) * 60, 520 + i * 70);
    ctx.rotate(((i - 1) * 6 * Math.PI) / 180);
    roundRect(ctx, -380, -214, 760, 428, 36);
    ctx.clip();
    drawCover(ctx, img, -380, -214, 760, 428);
    ctx.restore();
  });

  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = "600 40px system-ui, sans-serif";
  ctx.fillText(range.toUpperCase(), 90, 1060);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 84px Georgia, serif";
  wrapText(ctx, heading, 90, 1170, W - 180, 96);

  ctx.font = "500 54px system-ui, sans-serif";
  lines.forEach((line, i) => {
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillText(line, 90, 1400 + i * 90, W - 180);
  });

  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "700 44px system-ui, sans-serif";
  ctx.fillText("AuroraFlix", 90, H - 110);
  ctx.font = "400 36px system-ui, sans-serif";
  ctx.fillText("auroraflix.cloud", 90, H - 60);

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale;
  const sh = h / scale;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  let line = "";
  let row = 0;
  for (const word of text.split(" ")) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y + row * lineHeight);
      line = word;
      row++;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, y + row * lineHeight);
}
