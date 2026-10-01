"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { useOverlay } from "@/lib/overlay";
import { cn } from "../ui";

export function Sheet({
  open,
  onClose,
  title,
  children,
  className,
  full,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
  full?: boolean;
}) {
  useOverlay(open);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[95] flex items-end justify-center md:items-center md:p-6">
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", bounce: 0, duration: 0.35 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => (info.offset.y > 110 || info.velocity.y > 600) && onClose()}
            className={cn(
              "relative flex w-full flex-col overflow-hidden rounded-t-[28px] border-t border-line-strong bg-surface pb-[env(safe-area-inset-bottom)] shadow-[0_-20px_60px_-20px_rgb(0_0_0/0.9)] md:max-w-lg md:rounded-[28px] md:border md:pb-0",
              full ? "h-[92dvh] md:h-[80dvh]" : "max-h-[88dvh]",
              className,
            )}
          >
            <div className="flex shrink-0 justify-center pb-1 pt-2.5">
              <span className="h-1.5 w-11 rounded-full bg-line-strong" />
            </div>
            {title && (
              <div className="flex shrink-0 items-center gap-3 px-5 pb-3 pt-1">
                <button type="button" onClick={onClose} className="-ml-1.5 rounded-full p-1.5 text-muted hover:bg-surface-2 hover:text-ink" aria-label="Close">
                  <X className="size-5" />
                </button>
                <h2 className="flex-1 text-center font-display text-lg font-semibold">{title}</h2>
                <span className="w-8" />
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain" onPointerDownCapture={(e) => e.stopPropagation()}>
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
