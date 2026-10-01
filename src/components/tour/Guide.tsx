"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Lightbulb } from "lucide-react";
import { claimGuide, releaseGuide, useGuideOwner, useOverlayCount } from "@/lib/overlay";
import { setTutorial, useSessionUser, type SessionUser } from "@/lib/storage";
import { Button } from "../ui";
import { Spotlight } from "./Spotlight";
import { CARD_W, cardPosition, useTargetRect, type Place } from "./target";

export interface GuideStep {
  target: string;
  place?: Place;
  title: string;
  body: string;
}

export const ONBOARDING_STEPS = ["early-days", "import-asked"];

export function onboardingDone(user: SessionUser | null) {
  if (!user) return false;
  const g = user.tutorial.guides ?? [];
  return ONBOARDING_STEPS.every((s) => g.includes(s)) && (user.tutorial.done || g.includes("start-hub"));
}

export function useGuideSeen(id: string) {
  const user = useSessionUser();
  return !user || !!user.tutorial.guides?.includes(id);
}

export function markGuide(user: SessionUser, id: string) {
  if (user.tutorial.guides?.includes(id)) return;
  setTutorial({ ...user.tutorial, guides: [...(user.tutorial.guides ?? []), id].slice(-80) });
}

export function Guide({
  id,
  steps,
  onStep,
  layer = "page",
  finalLabel = "Got it",
  delay = 900,
}: {
  id: string;
  steps: GuideStep[];
  onStep?: (index: number) => void;
  layer?: "page" | "overlay";
  finalLabel?: string;
  delay?: number;
}) {
  const user = useSessionUser();
  const overlays = useOverlayCount();
  const owner = useGuideOwner();
  const seen = useGuideSeen(id);
  const [ready, setReady] = useState(false);
  const [index, setIndex] = useState(0);
  const [gaveUp, setGaveUp] = useState(false);
  const shown = useRef(false);
  const [, redraw] = useState(0);

  const blocked = layer === "page" ? overlays > 0 || !onboardingDone(user) : !onboardingDone(user);
  const eligible = ready && !seen && !blocked && !gaveUp && !!user;
  const mine = owner === id;

  useEffect(() => {
    const t = setTimeout(() => setReady(true), delay);
    const onResize = () => redraw((n) => n + 1);
    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", onResize);
      releaseGuide(id);
    };
  }, [id, delay]);

  useEffect(() => {
    if (eligible) claimGuide(id);
    else releaseGuide(id);
  }, [eligible, id, owner]);

  const active = eligible && mine;
  const step = steps[Math.min(index, steps.length - 1)];

  const finish = () => {
    if (user) markGuide(user, id);
    releaseGuide(id);
  };

  const rect = useTargetRect(step?.target, active, 75, () => {
    if (index < steps.length - 1) setIndex((i) => i + 1);
    else if (shown.current) finish();
    else {
      setGaveUp(true);
      releaseGuide(id);
    }
  }, () => {
    shown.current = true;
  });

  useEffect(() => {
    if (active) onStep?.(index);
  }, [index, active, onStep]);

  if (!active || !rect || !user) return null;
  const last = index >= steps.length - 1;
  const pos = cardPosition(rect, step.place);

  return (
    <div className="fixed inset-0 z-[90]" aria-live="polite">
      <Spotlight rect={rect} dim={0.5} />
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
              <Lightbulb className="size-3.5" /> {steps.length > 1 ? `Tip ${index + 1} of ${steps.length}` : "Tip"}
            </span>
            <button type="button" onClick={finish} className="rounded-md px-1.5 py-1 text-xs text-muted hover:bg-surface-2 hover:text-ink">
              Skip tips
            </button>
          </div>
          <h3 className="mt-2 font-display text-base font-semibold leading-snug">{step.title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted">{step.body}</p>
          <div className="mt-3 flex justify-end">
            <Button className="h-9" onClick={() => (last ? finish() : setIndex(index + 1))}>
              {last ? finalLabel : "Next"} {!last && <ArrowRight className="size-4" />}
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
