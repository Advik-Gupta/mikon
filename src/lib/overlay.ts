"use client";

import { useEffect, useSyncExternalStore } from "react";

let overlays = 0;
let guideOwner: string | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

export function useOverlay(active: boolean) {
  useEffect(() => {
    if (!active) return;
    overlays++;
    emit();
    return () => {
      overlays--;
      emit();
    };
  }, [active]);
}

export const useOverlayCount = () =>
  useSyncExternalStore(
    subscribe,
    () => overlays,
    () => 0,
  );

export const useGuideOwner = () =>
  useSyncExternalStore(
    subscribe,
    () => guideOwner,
    () => null,
  );

export function claimGuide(id: string) {
  if (guideOwner && guideOwner !== id) return false;
  if (guideOwner !== id) {
    guideOwner = id;
    emit();
  }
  return true;
}

export function releaseGuide(id: string) {
  if (guideOwner !== id) return;
  guideOwner = null;
  emit();
}
