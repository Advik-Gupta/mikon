"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Lightbulb } from "lucide-react";
import { setTutorial, useSessionUser } from "@/lib/storage";
import { Spotlight } from "./Spotlight";
import { Button } from "../ui";
import { CARD_W, cardPosition, useTargetRect } from "./Tour";

export interface GuideStep {
  target: string;
  place?: "right" | "left" | "top" | "bottom";
  title: string;
  body: string;
}

export function useGuideSeen(id: string) {
  const user = useSessionUser();
  if (!user) return true;
  return !user.tutorial.done || !!user.tutorial.guides?.includes(id);
}

export function Guide({ id, steps, onStep }: { id: string; steps: GuideStep[]; onStep?: (index: number) => void }) {
  const user = useSessionUser();
  const seen = useGuideSeen(id);
  const [index, setIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const step = steps[index];
  const { rect, missing } = useTargetRect(step, ready && !seen, 600);
  const [, redraw] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 700);
    const onResize = () => redraw((n) => n + 1);
    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    if (ready && !seen) onStep?.(index);
  }, [index, ready, seen, onStep]);

  if (seen || !ready || !user) return null;

  const close = () => setTutorial({ ...user.tutorial, guides: [...(user.tutorial.guides ?? []), id] });
  const last = index === steps.length - 1;
  const spot = rect && !missing ? rect : null;
  if (!spot && !missing) return null;
  const pos = cardPosition(spot, step.place);

  return (
    <div className="fixed inset-0 z-[70]" aria-live="polite">
      <Spotlight rect={spot} dim={0.55} />
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          role="dialog"
          aria-label={step.title}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed rounded-2xl border border-line-strong bg-surface p-4 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.9)]"
          style={{ width: CARD_W, maxWidth: "calc(100vw - 32px)", left: pos.left, top: pos.top }}
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-warn">
              <Lightbulb className="size-3.5" /> Tip {index + 1} of {steps.length}
            </span>
            <button type="button" onClick={close} className="rounded-md px-1.5 py-1 text-xs text-muted hover:bg-surface-2 hover:text-ink">
              Skip tips
            </button>
          </div>
          <h3 className="mt-2 font-display text-base font-semibold leading-snug">{step.title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted">{step.body}</p>
          <div className="mt-3 flex justify-end">
            <Button className="h-9" onClick={() => (last ? close() : setIndex(index + 1))}>
              {last ? "Start building" : "Next"} {!last && <ArrowRight className="size-4" />}
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
