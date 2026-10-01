"use client";

import { useEffect, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bell, CircleCheck, Lightbulb, TriangleAlert, X } from "lucide-react";
import { cn } from "./ui";

export interface Toast {
  id: string;
  title: string;
  message: string;
  tone?: "advice" | "warn" | "success" | "info";
  tag?: string;
}

let toasts: Toast[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function toast(t: Omit<Toast, "id" | "message"> & { message?: string }) {
  toasts = [...toasts, { message: "", ...t, id: crypto.randomUUID() }].slice(-4);
  emit();
}

function dismiss(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

const TONES = {
  advice: { icon: Lightbulb, chip: "bg-warn/15 text-warn", bar: "bg-warn" },
  warn: { icon: TriangleAlert, chip: "bg-danger/15 text-danger", bar: "bg-danger" },
  success: { icon: CircleCheck, chip: "bg-accent/15 text-accent", bar: "bg-accent" },
  info: { icon: Bell, chip: "bg-info/15 text-info", bar: "bg-info" },
};

function ToastCard({ t }: { t: Toast }) {
  useEffect(() => {
    const timer = setTimeout(() => dismiss(t.id), 9000);
    return () => clearTimeout(timer);
  }, [t.id]);
  const tone = TONES[t.tone ?? "advice"];
  const Icon = tone.icon;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
      className="pointer-events-auto relative w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-line-strong bg-surface/95 p-4 pr-10 shadow-[0_20px_50px_-15px_rgb(0_0_0/0.8)] backdrop-blur"
      role="status"
    >
      <div className="flex gap-3">
        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", tone.chip)}>
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-snug">{t.title}</p>
          {t.message && <p className="mt-1 text-xs leading-relaxed text-muted">{t.message}</p>}
          {t.tag && <span className="mt-2 inline-block rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-muted">{t.tag}</span>}
        </div>
      </div>
      <button type="button" onClick={() => dismiss(t.id)} className="absolute right-2.5 top-2.5 rounded-md p-1 text-faint hover:bg-surface-2 hover:text-ink" aria-label="Dismiss">
        <X className="size-4" />
      </button>
      <motion.span
        className={cn("absolute bottom-0 left-0 h-0.5", tone.bar)}
        initial={{ width: "100%" }}
        animate={{ width: "0%" }}
        transition={{ duration: 9, ease: "linear" }}
      />
    </motion.div>
  );
}

export function Toaster() {
  const list = useSyncExternalStore(
    subscribe,
    () => toasts,
    () => toasts,
  );
  return (
    <div className="pointer-events-none fixed bottom-[calc(max(env(safe-area-inset-bottom)_-_12px,4px)_+_62px)] right-4 z-[110] flex flex-col items-end gap-2 md:bottom-4">
      <AnimatePresence initial={false}>
        {list.map((t) => (
          <ToastCard key={t.id} t={t} />
        ))}
      </AnimatePresence>
    </div>
  );
}
