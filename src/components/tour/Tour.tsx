"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Compass, Plus, X } from "lucide-react";
import { displayName } from "@/lib/body";
import { setTutorial, useProfile, useSessionUser } from "@/lib/storage";
import { Button } from "../ui";
import { TOUR, type TourStep } from "./steps";

type Rect = { top: number; left: number; width: number; height: number };
const PAD = 8;
const CARD_W = 340;

function useTargetRect(step: TourStep | undefined, active: boolean) {
  const [rect, setRect] = useState<Rect | null>(null);
  const [missing, setMissing] = useState(false);

  useLayoutEffect(() => {
    if (!active || !step?.target) return;
    let frame = 0;
    let tries = 0;
    const measure = () => {
      const el = document.querySelector(`[data-tour="${step.target}"]`);
      const box = el?.getBoundingClientRect();
      if (box && box.width > 0) {
        setRect({ top: box.top - PAD, left: box.left - PAD, width: box.width + PAD * 2, height: box.height + PAD * 2 });
        setMissing(false);
      } else if (++tries > 90) {
        setMissing(true);
        return;
      }
      frame = requestAnimationFrame(measure);
    };
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    measure();
    return () => cancelAnimationFrame(frame);
  }, [step, active]);

  const live = active && !!step?.target;
  return { rect: live ? rect : null, missing: live && missing };
}

function cardPosition(rect: Rect | null, place: TourStep["place"]) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (!rect || vw < 640) return { left: Math.max(16, (vw - CARD_W) / 2), top: rect ? Math.min(vh - 260, rect.top + rect.height + 12) : vh / 2 - 120 };
  const clampX = (x: number) => Math.min(Math.max(16, x), vw - CARD_W - 16);
  const clampY = (y: number) => Math.min(Math.max(16, y), vh - 240);
  switch (place) {
    case "right":
      return { left: clampX(rect.left + rect.width + 14), top: clampY(rect.top) };
    case "left":
      return { left: clampX(rect.left - CARD_W - 14), top: clampY(rect.top) };
    case "top":
      return { left: clampX(rect.left), top: clampY(rect.top - 230) };
    default:
      return { left: clampX(rect.left + rect.width / 2 - CARD_W / 2), top: clampY(rect.top + rect.height + 14) };
  }
}

export function Tour() {
  const user = useSessionUser();
  const profile = useProfile();
  const router = useRouter();
  const pathname = usePathname();
  const [, setTick] = useState(0);

  const tutorial = user?.tutorial;
  const index = tutorial?.step ?? 0;
  const step = TOUR[Math.min(index, TOUR.length - 1)];
  const running = !!user && !!profile && !tutorial?.done;
  const onRoute = running && pathname === step.route;
  const { rect, missing } = useTargetRect(step, onRoute);

  useEffect(() => {
    const redraw = () => setTick((t) => t + 1);
    window.addEventListener("resize", redraw);
    return () => window.removeEventListener("resize", redraw);
  }, []);

  if (!running) return null;

  const go = (to: number) => {
    const next = TOUR[to];
    setTutorial({ step: to, done: false });
    if (next.route !== pathname) router.push(next.route);
  };
  const finish = (target?: string) => {
    setTutorial({ step: TOUR.length, done: true });
    if (target) router.push(target);
  };

  if (!onRoute) {
    return (
      <button
        type="button"
        onClick={() => router.push(step.route)}
        className="fixed bottom-4 left-4 z-[70] flex items-center gap-2 rounded-full border border-accent/40 bg-surface/95 px-4 py-2 text-sm font-medium shadow-2xl backdrop-blur hover:border-accent"
      >
        <Compass className="size-4 text-accent" /> Resume tour
      </button>
    );
  }

  const last = index === TOUR.length - 1;
  const spotlight = step.target && rect && !missing ? rect : null;
  const pos = cardPosition(spotlight, step.place);
  const name = profile ? displayName(profile) : "there";

  return (
    <div className="fixed inset-0 z-[70]" aria-live="polite">
      {spotlight ? (
        <motion.div
          className="pointer-events-none fixed rounded-2xl ring-2 ring-accent"
          initial={false}
          animate={{ top: spotlight.top, left: spotlight.left, width: spotlight.width, height: spotlight.height }}
          transition={{ type: "spring", bounce: 0.15, duration: 0.45 }}
          style={{ boxShadow: "0 0 0 9999px rgb(0 0 0 / 0.66)" }}
        />
      ) : (
        <div className="fixed inset-0 bg-black/66" />
      )}
      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          role="dialog"
          aria-label={step.title}
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="fixed rounded-2xl border border-line-strong bg-surface p-5 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.9)]"
          style={{ width: CARD_W, maxWidth: "calc(100vw - 32px)", left: pos.left, top: pos.top }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
              {index + 1} of {TOUR.length}
            </span>
            <button type="button" onClick={() => finish()} className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted hover:bg-surface-2 hover:text-ink">
              Skip tour <X className="size-3.5" />
            </button>
          </div>
          <h3 className="mt-2 font-display text-lg font-semibold leading-snug">{step.title.replace("{name}", name)}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">{step.body}</p>
          <div className="mt-4 flex items-center gap-2">
            <div className="flex flex-1 gap-1">
              {TOUR.map((s, i) => (
                <span key={s.id} className={`h-1 flex-1 rounded-full ${i <= index ? "bg-accent" : "bg-surface-3"}`} />
              ))}
            </div>
            {index > 0 && (
              <Button variant="ghost" className="h-9 px-2.5" onClick={() => go(index - 1)} aria-label="Back">
                <ArrowLeft className="size-4" />
              </Button>
            )}
            {last ? (
              <Button className="h-9" onClick={() => finish("/programs/new")}>
                <Plus className="size-4" strokeWidth={2.5} /> Create program
              </Button>
            ) : (
              <Button className="h-9" onClick={() => go(index + 1)}>
                {step.next ?? "Next"} <ArrowRight className="size-4" />
              </Button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
