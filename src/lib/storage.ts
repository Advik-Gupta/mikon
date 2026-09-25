"use client";

import { useSyncExternalStore } from "react";
import { migrateProfile } from "./migrate";
import type { Profile, Program } from "./types";

/**
 * Tiny localStorage-backed store. Stands in for a real backend until auth exists.
 * `undefined` from the hooks means "not hydrated yet" (server render / first paint);
 * `null` means "nothing stored".
 */

export const KEYS = {
  profile: "mikon.profile.v1",
  draft: "mikon.onboarding-draft.v1",
  programs: "mikon.programs.v1",
  sidebar: "mikon.sidebar-collapsed",
} as const;

const listeners = new Set<() => void>();
const cache = new Map<string, { raw: string | null; value: unknown }>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = () => cb();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

function emit() {
  listeners.forEach((l) => l());
}

type Transform = (v: never) => unknown;

/** Values under these keys are upgraded to the current schema as they're read. */
const TRANSFORMS: Record<string, Transform> = {
  [KEYS.profile]: migrateProfile as Transform,
  [KEYS.draft]: ((d: { profile: Profile }) => ({ ...d, profile: migrateProfile(d.profile) })) as Transform,
};

export function readStored<T>(key: string): T | null {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    return null;
  }
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.value as T | null;
  let value: T | null = null;
  try {
    value = raw ? (JSON.parse(raw) as T) : null;
    if (value != null && TRANSFORMS[key]) value = TRANSFORMS[key](value as never) as T;
  } catch {
    value = null;
  }
  cache.set(key, { raw, value });
  return value;
}

export function writeStored<T>(key: string, value: T | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or blocked — nothing sensible to do yet
  }
  emit();
}

export function useStored<T>(key: string): T | null | undefined {
  return useSyncExternalStore(
    subscribe,
    () => readStored<T>(key),
    () => undefined,
  );
}

export const useProfile = () => useStored<Profile>(KEYS.profile);
export const usePrograms = () => useStored<Program[]>(KEYS.programs);

export function saveProfile(p: Profile) {
  writeStored(KEYS.profile, { ...p, updatedAt: new Date().toISOString() });
}

export function resetAll() {
  Object.values(KEYS).forEach((k) => writeStored(k, null));
}
