"use client";

import { useLayoutEffect, useRef, useState } from "react";

export type Rect = { top: number; left: number; width: number; height: number };
export type Place = "right" | "left" | "top" | "bottom";
const PAD = 8;
export const CARD_W = 340;

const findTarget = (target: string) => [...document.querySelectorAll(`[data-tour="${target}"]`)].find((e) => e.getBoundingClientRect().width > 0);

export function useTargetRect(target: string | undefined, active: boolean, maxFrames = 75, onMissing?: () => void, onFound?: () => void) {
  const [rect, setRect] = useState<Rect | null>(null);
  const missingRef = useRef(onMissing);
  const foundRef = useRef(onFound);
  useLayoutEffect(() => {
    missingRef.current = onMissing;
    foundRef.current = onFound;
  });

  useLayoutEffect(() => {
    if (!active || !target) return;
    let frame = 0;
    let tries = 0;
    let scrolled = false;
    const measure = () => {
      const el = findTarget(target);
      const box = el?.getBoundingClientRect();
      if (el && box && box.width > 0) {
        if (!scrolled) {
          scrolled = true;
          foundRef.current?.();
          el.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
        setRect({ top: box.top - PAD, left: box.left - PAD, width: box.width + PAD * 2, height: box.height + PAD * 2 });
      } else if (++tries > maxFrames) {
        setRect(null);
        missingRef.current?.();
        return;
      }
      frame = requestAnimationFrame(measure);
    };
    frame = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(frame);
  }, [target, active, maxFrames]);

  return active ? rect : null;
}

export function cardPosition(rect: Rect | null, place: Place | undefined) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (!rect || vw < 640) {
    const left = Math.max(16, (vw - CARD_W) / 2);
    if (!rect) return { left, top: vh / 2 - 120 };
    const below = rect.top + rect.height + 12;
    if (below + 230 <= vh) return { left, top: below };
    if (rect.top - 250 >= 16) return { left, top: rect.top - 250 };
    return { left, top: Math.max(16, vh - 260) };
  }
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
