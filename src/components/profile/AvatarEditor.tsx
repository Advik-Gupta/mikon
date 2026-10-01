"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Camera, Loader2, RotateCw, Trash2, ZoomIn, ZoomOut } from "lucide-react";
import { apiSend } from "@/lib/api";
import { setSessionUser, useSessionUser } from "@/lib/storage";
import { useUploadThing } from "@/lib/uploadthing";
import { Modal } from "../Modal";
import { toast } from "../Toaster";
import { Avatar } from "../shell/Avatar";
import { Button } from "../ui";

const VIEW = 280;
const OUT = 512;

interface Img {
  el: HTMLImageElement;
  w: number;
  h: number;
  url: string;
}

function Cropper({ img, onCancel, onSave, busy }: { img: Img; onCancel: () => void; onSave: (blob: Blob) => void; busy: boolean }) {
  const [zoom, setZoom] = useState(1);
  const [rot, setRot] = useState(0);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const turned = rot % 180 !== 0;
  const w = turned ? img.h : img.w;
  const h = turned ? img.w : img.h;
  const scale = (VIEW / Math.min(w, h)) * zoom;
  const clamp = (p: { x: number; y: number }) => {
    const mx = Math.max(0, (w * scale - VIEW) / 2);
    const my = Math.max(0, (h * scale - VIEW) / 2);
    return { x: Math.min(mx, Math.max(-mx, p.x)), y: Math.min(my, Math.max(-my, p.y)) };
  };
  const at = clamp(pos);

  const down = (e: PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, x: at.x, y: at.y };
    setDragging(true);
  };
  const up = () => {
    drag.current = null;
    setDragging(false);
  };
  const move = (e: PointerEvent) => {
    const d = drag.current;
    if (d) setPos(clamp({ x: d.x + e.clientX - d.px, y: d.y + e.clientY - d.py }));
  };

  const save = () => {
    const canvas = document.createElement("canvas");
    canvas.width = OUT;
    canvas.height = OUT;
    const ctx = canvas.getContext("2d")!;
    const k = OUT / VIEW;
    ctx.fillStyle = "#111317";
    ctx.fillRect(0, 0, OUT, OUT);
    ctx.translate(OUT / 2 + at.x * k, OUT / 2 + at.y * k);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.scale(scale * k, scale * k);
    ctx.drawImage(img.el, -img.w / 2, -img.h / 2);
    canvas.toBlob((b) => b && onSave(b), "image/jpeg", 0.9);
  };

  return (
    <div>
      <div
        className="relative mx-auto touch-none select-none overflow-hidden rounded-2xl bg-black"
        style={{ width: VIEW, height: VIEW, cursor: dragging ? "grabbing" : "grab" }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onWheel={(e) => setZoom((z) => Math.min(4, Math.max(1, z - e.deltaY * 0.002)))}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img.url}
          alt=""
          draggable={false}
          className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
          style={{ width: img.w, height: img.h, transform: `translate(-50%, -50%) translate(${at.x}px, ${at.y}px) rotate(${rot}deg) scale(${scale})` }}
        />
        <svg className="pointer-events-none absolute inset-0" viewBox={`0 0 ${VIEW} ${VIEW}`} aria-hidden>
          <defs>
            <mask id="avatar-hole">
              <rect width={VIEW} height={VIEW} fill="white" />
              <circle cx={VIEW / 2} cy={VIEW / 2} r={VIEW / 2 - 6} fill="black" />
            </mask>
          </defs>
          <rect width={VIEW} height={VIEW} fill="rgb(0 0 0 / 0.6)" mask="url(#avatar-hole)" />
          <circle cx={VIEW / 2} cy={VIEW / 2} r={VIEW / 2 - 6} fill="none" stroke="rgb(255 255 255 / 0.7)" strokeWidth="1.5" />
        </svg>
      </div>

      <div className="mx-auto mt-5 flex max-w-xs items-center gap-3">
        <ZoomOut className="size-4 shrink-0 text-muted" />
        <input
          type="range"
          className="range"
          min={1}
          max={4}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          style={{ ["--fill" as string]: `${((zoom - 1) / 3) * 100}%` }}
          aria-label="Zoom"
        />
        <ZoomIn className="size-4 shrink-0 text-muted" />
        <button type="button" onClick={() => setRot((r) => (r + 90) % 360)} className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-ink" aria-label="Rotate">
          <RotateCw className="size-4" />
        </button>
      </div>
      <p className="mt-2 text-center text-xs text-faint">Drag to reposition. Scroll or use the slider to zoom.</p>

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button onClick={save} disabled={busy} className="px-6">
          {busy ? <Loader2 className="size-4 animate-spin" /> : null} {busy ? "Uploading…" : "Save photo"}
        </Button>
      </div>
    </div>
  );
}

export function AvatarEditor({ size = 88 }: { size?: number }) {
  const user = useSessionUser();
  const input = useRef<HTMLInputElement>(null);
  const [img, setImg] = useState<Img | null>(null);
  const { startUpload, isUploading } = useUploadThing("avatar", {
    onUploadError: (e) => toast({ tone: "warn", title: "Upload failed", message: e.message }),
  });

  useEffect(
    () => () => {
      if (img) URL.revokeObjectURL(img.url);
    },
    [img],
  );

  const pick = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast({ tone: "warn", title: "That isn't an image" });
    if (file.size > 15 * 1024 * 1024) return toast({ tone: "warn", title: "That image is over 15 MB" });
    const url = URL.createObjectURL(file);
    const el = new Image();
    el.onload = () => setImg({ el, w: el.naturalWidth, h: el.naturalHeight, url });
    el.onerror = () => toast({ tone: "warn", title: "Couldn't read that image" });
    el.src = url;
  };

  const upload = async (blob: Blob) => {
    const res = await startUpload([new File([blob], "avatar.jpg", { type: "image/jpeg" })]);
    const url = res?.[0]?.serverData?.url;
    if (url) {
      setSessionUser({ avatarUrl: url });
      toast({ tone: "success", title: "Profile photo updated" });
      setImg(null);
    }
  };

  const remove = async () => {
    await apiSend("DELETE", "/api/me/avatar");
    setSessionUser({ avatarUrl: null });
  };

  return (
    <>
      <div className="group relative">
        <button type="button" onClick={() => input.current?.click()} className="relative block rounded-full" aria-label="Change profile photo">
          <Avatar size={size} className="ring-4 ring-surface" />
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition group-hover:opacity-100">
            <Camera className="size-6" />
          </span>
          <span className="absolute bottom-0.5 right-0.5 flex size-7 items-center justify-center rounded-full border-2 border-surface bg-accent text-accent-ink sm:hidden">
            <Camera className="size-3.5" />
          </span>
        </button>
        {user?.avatarUrl && (
          <button
            type="button"
            onClick={remove}
            className="absolute -right-1 top-0 hidden size-7 items-center justify-center rounded-full border border-line bg-surface text-muted hover:text-danger group-hover:flex"
            aria-label="Remove photo"
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <Modal open={!!img} onClose={() => !isUploading && setImg(null)} title="Profile photo" subtitle="Frame your photo inside the circle." className="max-w-md">
        {img && <Cropper img={img} busy={isUploading} onCancel={() => setImg(null)} onSave={upload} />}
      </Modal>
    </>
  );
}
