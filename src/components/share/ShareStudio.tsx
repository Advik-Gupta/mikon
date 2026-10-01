"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Loader2, Share2 } from "lucide-react";
import { Sheet } from "../tracker/Sheet";
import { toast } from "../Toaster";
import { Button, cn } from "../ui";

export interface ShareStat {
  label: string;
  value: string;
}

export interface ShareBlock {
  title: string;
  star?: boolean;
  items: { left: string; right: string }[];
}

export interface ShareContent {
  kind: "workout" | "profile";
  eyebrow: string;
  title: string;
  subtitle: string;
  stats: ShareStat[];
  blocks: ShareBlock[];
  avatarUrl?: string | null;
  initials?: string;
  cta: string;
  url: string;
  fileName: string;
}

const THEMES = {
  lime: { label: "Lime", bg: ["#c6f432", "#9cd615"], ink: "#0a0b0d", sub: "rgba(10,11,13,0.62)", card: "rgba(10,11,13,0.08)", accent: "#0a0b0d", dots: "rgba(10,11,13,0.10)" },
  midnight: { label: "Midnight", bg: ["#111317", "#0a0b0d"], ink: "#eceef1", sub: "#8a919c", card: "rgba(255,255,255,0.05)", accent: "#c6f432", dots: "rgba(255,255,255,0.06)" },
  aurora: { label: "Aurora", bg: ["#3b1d8f", "#0b6e8a"], ink: "#ffffff", sub: "rgba(255,255,255,0.72)", card: "rgba(255,255,255,0.10)", accent: "#c6f432", dots: "rgba(255,255,255,0.07)" },
  sunset: { label: "Sunset", bg: ["#ff7a45", "#d6246e"], ink: "#ffffff", sub: "rgba(255,255,255,0.75)", card: "rgba(255,255,255,0.14)", accent: "#fff7d1", dots: "rgba(255,255,255,0.08)" },
};
type ThemeId = keyof typeof THEMES;

const SIZES = {
  story: { label: "Story", w: 1080, h: 1920 },
  post: { label: "Post", w: 1080, h: 1350 },
  square: { label: "Square", w: 1080, h: 1080 },
};
type SizeId = keyof typeof SIZES;

function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function fit(ctx: CanvasRenderingContext2D, text: string, max: number) {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > max) t = t.slice(0, -1);
  return `${t}…`;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const probe = document.createElement("canvas").getContext("2d")!;
        probe.drawImage(img, 0, 0, 1, 1);
        probe.getImageData(0, 0, 1, 1);
        resolve(img);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function draw(canvas: HTMLCanvasElement, c: ShareContent, themeId: ThemeId, sizeId: SizeId, hidden: Set<string>) {
  const t = THEMES[themeId];
  const { w, h } = SIZES[sizeId];
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  await document.fonts.ready;
  const css = getComputedStyle(document.body);
  const display = css.getPropertyValue("--font-display").trim() || "system-ui";
  const sans = css.getPropertyValue("--font-geist-sans").trim() || "system-ui";
  const font = (weight: number, size: number, fam = display) => `${weight} ${size}px ${fam}, system-ui, sans-serif`;

  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, t.bg[0]);
  g.addColorStop(1, t.bg[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = t.dots;
  for (let x = 18; x < w; x += 36) for (let y = 18; y < h; y += 36) ctx.fillRect(x, y, 3, 3);

  const pad = 84;
  const tall = sizeId === "story";
  const k = tall ? 1.22 : 1;
  let y = tall ? 170 : 110;

  ctx.fillStyle = t.ink;
  rounded(ctx, pad, y - 56, 72, 72, 20);
  ctx.fillStyle = t.accent === t.ink ? t.ink : t.accent;
  ctx.fill();
  ctx.save();
  ctx.translate(pad + 8, y - 48);
  ctx.scale(1.75, 1.75);
  ctx.strokeStyle = themeId === "lime" ? "#c6f432" : "#0a0b0d";
  ctx.lineWidth = 2.8;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke(new Path2D("M8 22V11.5l5 6 3-3.6 3 3.6 5-6V22"));
  ctx.restore();
  ctx.fillStyle = t.ink;
  ctx.font = font(700, 46);
  ctx.textBaseline = "middle";
  ctx.fillText("mikon", pad + 92, y - 20);

  ctx.textBaseline = "alphabetic";
  y += tall ? 260 : 110;
  ctx.fillStyle = t.sub;
  ctx.font = font(600, 30, sans);
  ctx.fillText(c.eyebrow.toUpperCase(), pad, y);
  y += 30;

  if (c.kind === "profile") {
    const size = 200;
    y += 30;
    ctx.save();
    ctx.beginPath();
    ctx.arc(pad + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
    const img = c.avatarUrl ? await loadImage(c.avatarUrl) : null;
    if (img) ctx.drawImage(img, pad, y, size, size);
    else {
      ctx.fillStyle = t.card;
      ctx.fillRect(pad, y, size, size);
      ctx.fillStyle = t.ink;
      ctx.font = font(700, 84);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(c.initials ?? "M", pad + size / 2, y + size / 2 + 4);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
    }
    ctx.restore();
    y += size + 30;
  }

  ctx.fillStyle = t.ink;
  ctx.font = font(700, (c.title.length > 18 ? 84 : 104) * k);
  y += (c.title.length > 18 ? 84 : 104) * k;
  ctx.fillText(fit(ctx, c.title, w - pad * 2), pad, y);
  y += 56;
  ctx.fillStyle = t.sub;
  ctx.font = font(500, 36, sans);
  ctx.fillText(fit(ctx, c.subtitle, w - pad * 2), pad, y);

  y += tall ? 80 : 56;
  const cols = Math.min(3, c.stats.length);
  const gap = 20;
  const cw = (w - pad * 2 - gap * (cols - 1)) / cols;
  c.stats.slice(0, 3).forEach((s, i) => {
    const x = pad + i * (cw + gap);
    rounded(ctx, x, y, cw, 190 * k, 36);
    ctx.fillStyle = t.card;
    ctx.fill();
    ctx.fillStyle = t.ink;
    ctx.font = font(700, (s.value.length > 7 ? 54 : 66) * k);
    ctx.fillText(fit(ctx, s.value, cw - 56), x + 32, y + 104 * k);
    ctx.fillStyle = t.sub;
    ctx.font = font(600, 28 * k, sans);
    ctx.fillText(s.label, x + 32, y + 152 * k);
  });
  y += 190 * k + (tall ? 90 : 44);

  const footer = 170;
  const block = (b: ShareBlock, star: boolean) => {
    if (y > h - footer - 140) return;
    ctx.fillStyle = t.sub;
    ctx.font = font(700, 28, sans);
    ctx.fillText(b.title.toUpperCase(), pad, y);
    y += 26;
    for (const it of b.items) {
      if (y + 92 * k > h - footer) break;
      rounded(ctx, pad, y, w - pad * 2, 84 * k, 26);
      ctx.fillStyle = t.card;
      ctx.fill();
      ctx.fillStyle = t.ink;
      ctx.font = font(600, 36 * k, sans);
      const rightW = ctx.measureText(it.right).width;
      ctx.fillText(fit(ctx, `${star ? "★  " : ""}${it.left}`, w - pad * 2 - rightW - 90), pad + 32, y + 54 * k);
      ctx.fillStyle = star ? t.accent : t.sub;
      ctx.fillText(it.right, w - pad - 32 - rightW, y + 54 * k);
      y += 98 * k;
    }
    y += 34;
  };
  for (const b of c.blocks) if (!hidden.has(b.title) && b.items.length) block(b, !!b.star);

  ctx.fillStyle = t.ink;
  ctx.font = font(700, 40);
  ctx.fillText(c.cta, pad, h - 110);
  ctx.fillStyle = t.sub;
  ctx.font = font(500, 32, sans);
  ctx.fillText(c.url.replace(/^https?:\/\//, ""), pad, h - 64);
}

export function ShareStudio({ content, open, onClose }: { content: ShareContent | null; open: boolean; onClose: () => void }) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const [theme, setTheme] = useState<ThemeId>("midnight");
  const [size, setSize] = useState<SizeId>("story");
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !content) return;
    let live = true;
    canvas.current ??= document.createElement("canvas");
    draw(canvas.current, content, theme, size, hidden).then(() => {
      if (live && canvas.current) setPreview(canvas.current.toDataURL("image/png"));
    });
    return () => {
      live = false;
    };
  }, [open, content, theme, size, hidden]);

  const blob = () => new Promise<Blob | null>((r) => canvas.current?.toBlob(r, "image/png") ?? r(null));

  const share = async () => {
    if (!content) return;
    setBusy(true);
    try {
      const b = await blob();
      if (!b) throw new Error("Couldn't create the image");
      const file = new File([b], content.fileName, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: content.title, text: `${content.cta} ${content.url}` });
      else download(b);
    } catch (e) {
      if ((e as Error).name !== "AbortError") toast({ tone: "warn", title: "Couldn't share", message: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const download = (b: Blob) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = content?.fileName ?? "mikon.png";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  const pill = (on: boolean) => cn("shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition", on ? "border-ink bg-ink text-bg" : "border-line bg-surface-2 text-muted");

  return (
    <Sheet open={open} onClose={onClose} title="Share" full>
      <div className="flex h-full flex-col px-4 pb-4">
        <div className="flex min-h-0 flex-1 items-center justify-center rounded-3xl bg-surface-2/60 p-3">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Share preview" className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl" />
          ) : (
            <Loader2 className="size-6 animate-spin text-muted" />
          )}
        </div>
        <div className="scrollbar-thin -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
          {(Object.keys(THEMES) as ThemeId[]).map((id) => (
            <button key={id} type="button" onClick={() => setTheme(id)} className={cn("flex shrink-0 items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm font-medium", theme === id ? "border-ink" : "border-line text-muted")}>
              <span className="size-6 rounded-full" style={{ background: `linear-gradient(135deg, ${THEMES[id].bg[0]}, ${THEMES[id].bg[1]})` }} />
              {THEMES[id].label}
            </button>
          ))}
        </div>
        <div className="scrollbar-thin -mx-4 mt-2 flex gap-2 overflow-x-auto px-4">
          {(Object.keys(SIZES) as SizeId[]).map((id) => (
            <button key={id} type="button" onClick={() => setSize(id)} className={pill(size === id)}>
              {SIZES[id].label}
            </button>
          ))}
          {content?.blocks
            .filter((b) => b.items.length)
            .map((b) => (
              <button
                key={b.title}
                type="button"
                onClick={() =>
                  setHidden((h) => {
                    const n = new Set(h);
                    if (n.has(b.title)) n.delete(b.title);
                    else n.add(b.title);
                    return n;
                  })
                }
                className={pill(!hidden.has(b.title))}
              >
                {b.title}
              </button>
            ))}
        </div>
        <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
          <Button onClick={share} disabled={busy || !preview} className="h-12 rounded-full text-[15px]">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Share2 className="size-4" />} Share
          </Button>
          <Button variant="secondary" onClick={async () => { const b = await blob(); if (b) download(b); }} disabled={!preview} className="h-12 rounded-full px-4" aria-label="Save image">
            <Download className="size-4" />
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
