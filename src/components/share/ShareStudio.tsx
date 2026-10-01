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
  apps?: boolean;
}

const APP_LOGOS = [
  ["Strong", "/logos/strong.png"],
  ["Hevy", "/logos/hevy.png"],
  ["Lyfta", "/logos/lyfta.png"],
  ["MacroFactor", "/logos/macrofactor.png"],
];

const THEMES = {
  lime: { label: "Lime", bg: ["#d9ff4d", "#9cd615"], ink: "#0a0b0d", sub: "rgba(10,11,13,0.6)", card: "rgba(10,11,13,0.07)", line: "rgba(10,11,13,0.12)", accent: "#0a0b0d", glow: "rgba(255,255,255,0.45)" },
  midnight: { label: "Midnight", bg: ["#16191f", "#07080a"], ink: "#eceef1", sub: "#8a919c", card: "rgba(255,255,255,0.05)", line: "rgba(255,255,255,0.08)", accent: "#c6f432", glow: "rgba(198,244,50,0.18)" },
  aurora: { label: "Aurora", bg: ["#4c1fb3", "#0b7a96"], ink: "#ffffff", sub: "rgba(255,255,255,0.72)", card: "rgba(255,255,255,0.10)", line: "rgba(255,255,255,0.14)", accent: "#c6f432", glow: "rgba(120,220,255,0.35)" },
  sunset: { label: "Sunset", bg: ["#ff8a4c", "#d42a6f"], ink: "#ffffff", sub: "rgba(255,255,255,0.78)", card: "rgba(255,255,255,0.14)", line: "rgba(255,255,255,0.18)", accent: "#fff3c4", glow: "rgba(255,230,160,0.4)" },
  ocean: { label: "Ocean", bg: ["#0f4c75", "#062033"], ink: "#e8f6ff", sub: "rgba(232,246,255,0.7)", card: "rgba(255,255,255,0.08)", line: "rgba(255,255,255,0.12)", accent: "#5ee6ff", glow: "rgba(94,230,255,0.25)" },
  paper: { label: "Paper", bg: ["#f4f2ee", "#e3e0d9"], ink: "#111111", sub: "rgba(17,17,17,0.55)", card: "rgba(17,17,17,0.05)", line: "rgba(17,17,17,0.1)", accent: "#111111", glow: "rgba(255,255,255,0.6)" },
};
type ThemeId = keyof typeof THEMES;

const SIZES = {
  story: { label: "Story", w: 1080, h: 1920 },
  post: { label: "Post", w: 1080, h: 1350 },
  square: { label: "Square", w: 1080, h: 1080 },
};
type SizeId = keyof typeof SIZES;

const FONTS = {
  grotesk: { label: "Grotesk", head: "--font-display", body: "--font-geist-sans" },
  clean: { label: "Clean", head: "--font-geist-sans", body: "--font-geist-sans" },
  mono: { label: "Mono", head: "--font-geist-mono", body: "--font-geist-mono" },
  serif: { label: "Serif", head: "serif", body: "--font-geist-sans" },
};
type FontId = keyof typeof FONTS;

const LAYOUTS = { classic: "Classic", hero: "Big number" };
type LayoutId = keyof typeof LAYOUTS;

interface Prefs {
  theme: ThemeId;
  size: SizeId;
  font: FontId;
  layout: LayoutId;
  hidden: string[];
}
const PREFS_KEY = "mikon.share-prefs";
const DEFAULT: Prefs = { theme: "midnight", size: "story", font: "grotesk", layout: "classic", hidden: [] };

function loadPrefs(): Prefs {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}");
    return {
      theme: p.theme in THEMES ? p.theme : DEFAULT.theme,
      size: p.size in SIZES ? p.size : DEFAULT.size,
      font: p.font in FONTS ? p.font : DEFAULT.font,
      layout: p.layout in LAYOUTS ? p.layout : DEFAULT.layout,
      hidden: Array.isArray(p.hidden) ? p.hidden : [],
    };
  } catch {
    return DEFAULT;
  }
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

const GLYPH = "M8 22V11.5l5 6 3-3.6 3 3.6 5-6V22";

async function draw(canvas: HTMLCanvasElement, c: ShareContent, p: Prefs) {
  const t = THEMES[p.theme];
  const { w, h } = SIZES[p.size];
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  await document.fonts.ready;
  const css = getComputedStyle(document.body);
  const fam = (v: string) => (v.startsWith("--") ? css.getPropertyValue(v).trim() || "system-ui" : "Georgia, 'Times New Roman'");
  const head = fam(FONTS[p.font].head);
  const body = fam(FONTS[p.font].body);
  const font = (weight: number, size: number, f = head) => `${weight} ${Math.round(size)}px ${f}, system-ui, sans-serif`;
  const fitSize = (text: string, weight: number, start: number, max: number, f = head) => {
    let size = start;
    ctx.font = font(weight, size, f);
    while (size > 18 && ctx.measureText(text).width > max) {
      size -= 2;
      ctx.font = font(weight, size, f);
    }
    return size;
  };
  const ellipsis = (text: string, max: number) => {
    if (ctx.measureText(text).width <= max) return text;
    let s = text;
    while (s.length > 1 && ctx.measureText(`${s}…`).width > max) s = s.slice(0, -1);
    return `${s.trimEnd()}…`;
  };
  const wrap = (text: string, max: number, count: number) => {
    const out: string[] = [];
    let cur = "";
    for (const word of text.split(/\s+/)) {
      const next = cur ? `${cur} ${word}` : word;
      if (ctx.measureText(next).width <= max || !cur) cur = next;
      else {
        out.push(cur);
        cur = word;
      }
    }
    if (cur) out.push(cur);
    if (out.length > count) {
      const rest = out.slice(count - 1).join(" ");
      out.length = count - 1;
      out.push(ellipsis(rest, max));
    }
    return out.map((l) => ellipsis(l, max));
  };
  const box = (x: number, y: number, bw: number, bh: number, r: number, fill: string, stroke?: string) => {
    ctx.beginPath();
    ctx.roundRect(x, y, bw, bh, r);
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  };
  const glyph = (x: number, y: number, scale: number, color: string, alpha = 1) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke(new Path2D(GLYPH));
    ctx.restore();
  };

  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, t.bg[0]);
  bg.addColorStop(1, t.bg[1]);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  const glow = ctx.createRadialGradient(w * 0.9, h * 0.06, 0, w * 0.9, h * 0.06, w);
  glow.addColorStop(0, t.glow);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  glyph(w * 0.3, h - w * 0.62, w / 30, t.ink, 0.05);
  ctx.fillStyle = t.line;
  for (let x = 24; x < w; x += 40) for (let y = 24; y < h; y += 40) ctx.fillRect(x, y, 2, 2);

  const pad = 80;
  const inner = w - pad * 2;
  const k = p.size === "story" ? 1.18 : p.size === "square" ? 0.88 : 1;
  const dark = p.theme === "lime" || p.theme === "paper";
  let y = p.size === "story" ? 120 : 84;

  box(pad, y, 60, 60, 17, dark ? t.ink : t.accent);
  glyph(pad + 7, y + 7, 1.45, p.theme === "lime" ? "#c6f432" : p.theme === "paper" ? "#f4f2ee" : "#0a0b0d");
  ctx.fillStyle = t.ink;
  ctx.font = font(700, 40);
  ctx.textBaseline = "middle";
  ctx.fillText("mikon", pad + 78, y + 31);
  ctx.fillStyle = t.sub;
  ctx.font = font(600, 24, body);
  const tag = c.eyebrow.toUpperCase();
  ctx.fillText(tag, w - pad - ctx.measureText(tag).width, y + 31);
  ctx.textBaseline = "alphabetic";
  y += 60 + (p.size === "story" ? 90 : 56);

  if (c.kind === "profile") {
    const size = 168 * k;
    ctx.save();
    ctx.beginPath();
    ctx.arc(pad + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
    const img = c.avatarUrl ? await loadImage(c.avatarUrl) : null;
    if (img) {
      const s = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, pad, y, size, size);
    } else {
      ctx.fillStyle = t.card;
      ctx.fillRect(pad, y, size, size);
      ctx.fillStyle = t.ink;
      ctx.font = font(700, size * 0.42);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(c.initials ?? "M", pad + size / 2, y + size / 2 + 4);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
    }
    ctx.restore();
    ctx.beginPath();
    ctx.arc(pad + size / 2, y + size / 2, size / 2 + 7, 0, Math.PI * 2);
    ctx.strokeStyle = dark ? t.ink : t.accent;
    ctx.lineWidth = 5;
    ctx.stroke();
    y += size + 30;
  }

  const titleSize = 94 * k;
  ctx.font = font(700, titleSize);
  ctx.fillStyle = t.ink;
  for (const line of wrap(c.title, inner, 2)) {
    y += titleSize;
    ctx.fillText(line, pad - 3, y);
  }
  y += 48 * k;
  ctx.fillStyle = t.sub;
  ctx.font = font(500, 32 * k, body);
  ctx.fillText(ellipsis(c.subtitle, inner), pad, y);
  y += 60 * k;

  if (p.layout === "hero" && c.stats.length) {
    const isBig = (s: ShareStat) => s.label === "Volume" || s.label === "Lifted";
    const hero = c.stats.find(isBig) ?? c.stats[0];
    const rest = c.stats.filter((s) => s !== hero);
    ctx.fillStyle = dark ? t.ink : t.accent;
    const size = fitSize(hero.value, 800, 210 * k, inner);
    y += size * 0.86;
    ctx.fillText(hero.value, pad - 6, y);
    y += 50 * k;
    ctx.fillStyle = t.sub;
    ctx.font = font(700, 28 * k, body);
    ctx.fillText(`${hero.label.toUpperCase()}${c.kind === "workout" ? " MOVED" : ""}`, pad, y);
    y += 46 * k;
    ctx.fillStyle = t.line;
    ctx.fillRect(pad, y, inner, 2);
    y += 82 * k;
    const cw = inner / Math.max(1, rest.length);
    rest.forEach((s, i) => {
      const x = pad + i * cw;
      ctx.fillStyle = t.ink;
      fitSize(s.value, 700, 72 * k, cw - 30);
      ctx.fillText(s.value, x, y);
      ctx.fillStyle = t.sub;
      ctx.font = font(600, 26 * k, body);
      ctx.fillText(s.label, x, y + 44 * k);
    });
    y += 120 * k;
  } else {
    const cols = Math.min(3, c.stats.length);
    const gap = 18;
    const cw = (inner - gap * (cols - 1)) / cols;
    const ch = 172 * k;
    c.stats.slice(0, 3).forEach((s, i) => {
      const x = pad + i * (cw + gap);
      box(x, y, cw, ch, 32, t.card, t.line);
      ctx.fillStyle = t.ink;
      fitSize(s.value, 700, 62 * k, cw - 52);
      ctx.fillText(s.value, x + 28, y + ch * 0.55);
      ctx.fillStyle = t.sub;
      ctx.font = font(600, 25 * k, body);
      ctx.fillText(s.label, x + 28, y + ch * 0.8);
    });
    y += ch + 66 * k;
  }

  const appsH = c.apps ? 250 * Math.min(1, k) : 0;
  const footerTop = h - (p.size === "story" ? 220 : 170) - appsH;
  for (const b of c.blocks) {
    if (p.hidden.includes(b.title) || !b.items.length) continue;
    if (y > footerTop - 120) break;
    ctx.fillStyle = t.sub;
    ctx.font = font(700, 24 * k, body);
    ctx.fillText(b.title.toUpperCase(), pad, y);
    y += 22 * k;
    const rowH = 76 * k;
    for (const it of b.items) {
      if (y + rowH > footerTop) break;
      box(pad, y, inner, rowH, 22, t.card, t.line);
      ctx.font = font(600, 30 * k, body);
      const rightW = ctx.measureText(it.right).width;
      ctx.fillStyle = b.star ? (dark ? t.ink : t.accent) : t.sub;
      ctx.fillText(it.right, w - pad - 26 - rightW, y + rowH * 0.62);
      ctx.fillStyle = t.ink;
      ctx.fillText(ellipsis(`${b.star ? "★  " : ""}${it.left}`, inner - rightW - 90), pad + 26, y + rowH * 0.62);
      y += rowH + 12;
    }
    y += 42 * k;
  }

  if (c.apps) {
    let ay = footerTop + 30;
    ctx.fillStyle = t.sub;
    ctx.font = font(700, 24 * Math.min(1, k), body);
    ctx.fillText("IMPORT AND EXPORT YOUR HISTORY", pad, ay);
    ay += 26;
    const logos = await Promise.all(APP_LOGOS.map(([, src]) => loadImage(src)));
    const gap = 16;
    const tw = (inner - gap * 3) / 4;
    const th = 150 * Math.min(1, k);
    APP_LOGOS.forEach(([name], i) => {
      const x = pad + i * (tw + gap);
      box(x, ay, tw, th, 26, t.card, t.line);
      const img = logos[i];
      const s = th * 0.48;
      if (img) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x + (tw - s) / 2, ay + 18, s, s, s * 0.26);
        ctx.clip();
        ctx.drawImage(img, x + (tw - s) / 2, ay + 18, s, s);
        ctx.restore();
      }
      ctx.fillStyle = t.ink;
      ctx.font = font(600, 22 * Math.min(1, k), body);
      const label = ellipsis(name, tw - 16);
      ctx.fillText(label, x + (tw - ctx.measureText(label).width) / 2, ay + th - 22);
    });
  }

  const fy = h - (p.size === "story" ? 140 : 100);
  ctx.fillStyle = t.line;
  ctx.fillRect(pad, fy - 66, inner, 2);
  ctx.fillStyle = t.ink;
  ctx.font = font(700, 36);
  ctx.fillText(ellipsis(c.cta, inner), pad, fy);
  ctx.fillStyle = t.sub;
  ctx.font = font(500, 26, body);
  ctx.fillText(ellipsis(c.url.replace(/^https?:\/\//, ""), inner), pad, fy + 42);
}

export function ShareStudio({ content, open, onClose }: { content: ShareContent | null; open: boolean; onClose: () => void }) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT);
  const [loaded, setLoaded] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || loaded) return;
    const timer = setTimeout(() => {
      setPrefs(loadPrefs());
      setLoaded(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [open, loaded]);

  const update = (patch: Partial<Prefs>) =>
    setPrefs((p) => {
      const next = { ...p, ...patch };
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

  useEffect(() => {
    if (!open || !content || !loaded) return;
    let live = true;
    canvas.current ??= document.createElement("canvas");
    draw(canvas.current, content, prefs).then(() => {
      if (live && canvas.current) setPreview(canvas.current.toDataURL("image/png"));
    });
    return () => {
      live = false;
    };
  }, [open, content, prefs, loaded]);

  const blob = () => new Promise<Blob | null>((r) => (canvas.current ? canvas.current.toBlob(r, "image/png") : r(null)));

  const download = (b: Blob) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = content?.fileName ?? "mikon.png";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

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

  const pill = (on: boolean) => cn("shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition", on ? "border-ink bg-ink text-bg" : "border-line bg-surface-2 text-muted");
  const row = "scrollbar-thin -mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5";
  const label = "mb-1.5 mt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint";

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
        <div className="shrink-0">
          <p className={label}>Colour</p>
          <div className={row}>
            {(Object.keys(THEMES) as ThemeId[]).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => update({ theme: id })}
                className={cn("flex shrink-0 items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm font-medium", prefs.theme === id ? "border-ink" : "border-line text-muted")}
              >
                <span className="size-6 rounded-full" style={{ background: `linear-gradient(135deg, ${THEMES[id].bg[0]}, ${THEMES[id].bg[1]})` }} />
                {THEMES[id].label}
              </button>
            ))}
          </div>
          <p className={label}>Layout and font</p>
          <div className={row}>
            {(Object.keys(LAYOUTS) as LayoutId[]).map((id) => (
              <button key={id} type="button" onClick={() => update({ layout: id })} className={pill(prefs.layout === id)}>
                {LAYOUTS[id]}
              </button>
            ))}
            <span className="w-px shrink-0 bg-line" />
            {(Object.keys(FONTS) as FontId[]).map((id) => (
              <button key={id} type="button" onClick={() => update({ font: id })} className={pill(prefs.font === id)}>
                {FONTS[id].label}
              </button>
            ))}
          </div>
          <p className={label}>Size and details</p>
          <div className={row}>
            {(Object.keys(SIZES) as SizeId[]).map((id) => (
              <button key={id} type="button" onClick={() => update({ size: id })} className={pill(prefs.size === id)}>
                {SIZES[id].label}
              </button>
            ))}
            <span className="w-px shrink-0 bg-line" />
            {content?.blocks
              .filter((b) => b.items.length)
              .map((b) => (
                <button
                  key={b.title}
                  type="button"
                  onClick={() => update({ hidden: prefs.hidden.includes(b.title) ? prefs.hidden.filter((x) => x !== b.title) : [...prefs.hidden, b.title] })}
                  className={pill(!prefs.hidden.includes(b.title))}
                >
                  {b.title}
                </button>
              ))}
          </div>
        </div>
        <div className="mt-3 grid shrink-0 grid-cols-[1fr_auto] gap-2">
          <Button onClick={share} disabled={busy || !preview} className="h-12 rounded-full text-[15px]">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Share2 className="size-4" />} Share
          </Button>
          <Button
            variant="secondary"
            onClick={async () => {
              const b = await blob();
              if (b) download(b);
            }}
            disabled={!preview}
            className="h-12 rounded-full px-4"
            aria-label="Save image"
          >
            <Download className="size-4" />
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
