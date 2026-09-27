"use client";

import { useSyncExternalStore } from "react";
import { migrateProfile } from "./migrate";
import type { Profile, Program } from "./types";

export const KEYS = {
  profile: "mikon.profile.v1",
  draft: "mikon.onboarding-draft.v1",
  programs: "mikon.programs.v1",
  sidebar: "mikon.sidebar-collapsed",
  customExercises: "mikon.custom-exercises.v1",
} as const;

const SYNCED = new Set<string>([KEYS.profile, KEYS.draft, KEYS.programs, KEYS.customExercises]);

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  tutorial: { step: number; done: boolean };
}

const memory = new Map<string, unknown>();
const localCache = new Map<string, { raw: string | null; value: unknown }>();
const listeners = new Set<() => void>();
let hydrated = false;
let user: SessionUser | null = null;
let saving = 0;
let saveError = false;

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function emit() {
  listeners.forEach((l) => l());
}

async function api(method: string, url: string, body?: unknown, keepalive = false) {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    keepalive,
  });
  if (res.status === 401) {
    window.location.replace("/login");
    throw new Error("unauthorized");
  }
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? `Request failed (${res.status})`);
  return res.json();
}

const pending = new Map<string, (keepalive: boolean) => Promise<unknown>>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();

async function run(id: string, keepalive = false) {
  const task = pending.get(id);
  if (!task) return;
  pending.delete(id);
  saving++;
  emit();
  try {
    await task(keepalive);
    saveError = false;
  } catch {
    saveError = true;
    if (!pending.has(id)) schedule(id, task, 3000);
  } finally {
    saving--;
    emit();
  }
}

function schedule(id: string, task: (keepalive: boolean) => Promise<unknown>, delay = 500) {
  pending.set(id, task);
  clearTimeout(timers.get(id));
  timers.set(
    id,
    setTimeout(() => run(id), delay),
  );
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => [...pending.keys()].forEach((id) => run(id, true)));
}

function persistList<T extends { id: string }>(route: string, prev: T[] | null, next: T[] | null) {
  const before = new Map((prev ?? []).map((x) => [x.id, x]));
  const after = new Map((next ?? []).map((x) => [x.id, x]));
  after.forEach((item, id) => {
    if (before.get(id) !== item) schedule(`${route}:${id}`, (k) => api("PUT", `/api/${route}/${id}`, item, k));
  });
  before.forEach((_, id) => {
    if (!after.has(id)) schedule(`${route}:${id}`, (k) => api("DELETE", `/api/${route}/${id}`, undefined, k), 0);
  });
}

function persist(key: string, prev: unknown, next: unknown) {
  if (key === KEYS.profile) {
    schedule("profile", (k) => (next ? api("PUT", "/api/profile", next, k) : api("DELETE", "/api/profile", undefined, k)));
  } else if (key === KEYS.draft) {
    schedule("draft", (k) => api("PUT", "/api/profile/draft", next ?? null, k), 800);
  } else if (key === KEYS.programs) {
    persistList("programs", prev as Program[] | null, next as Program[] | null);
  } else if (key === KEYS.customExercises) {
    persistList("custom-exercises", prev as { id: string }[] | null, next as { id: string }[] | null);
  }
}

let hydrating: Promise<"ok" | "unauthorized" | "error"> | null = null;

export function hydrate() {
  hydrating ??= (async () => {
    try {
      const res = await fetch("/api/bootstrap", { cache: "no-store" });
      if (res.status === 401) return "unauthorized" as const;
      if (!res.ok) throw new Error();
      const data = await res.json();
      user = data.user;
      memory.set(KEYS.profile, data.profile ? migrateProfile(data.profile) : null);
      memory.set(KEYS.draft, data.draft ? { ...data.draft, profile: migrateProfile(data.draft.profile) } : null);
      memory.set(KEYS.programs, data.programs ?? []);
      memory.set(KEYS.customExercises, data.customExercises ?? []);
      SYNCED.forEach((k) => window.localStorage.removeItem(k));
      hydrated = true;
      emit();
      return "ok" as const;
    } catch {
      hydrating = null;
      return "error" as const;
    }
  })();
  return hydrating;
}

export const useSessionUser = () =>
  useSyncExternalStore(
    subscribe,
    () => user,
    () => null,
  );

export const useSaveStatus = () =>
  useSyncExternalStore(
    subscribe,
    () => (saving > 0 ? "saving" : saveError ? "error" : "saved"),
    () => "saved",
  );

export function setTutorial(tutorial: SessionUser["tutorial"]) {
  if (!user) return;
  user = { ...user, tutorial };
  emit();
  schedule("tutorial", (k) => api("PATCH", "/api/me/tutorial", tutorial, k), 0);
}

export async function logout() {
  await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
  window.location.replace("/login");
}

export function readStored<T>(key: string): T | null {
  if (SYNCED.has(key)) return (memory.get(key) as T | undefined) ?? null;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    return null;
  }
  const hit = localCache.get(key);
  if (hit && hit.raw === raw) return hit.value as T | null;
  let value: T | null = null;
  try {
    value = raw ? (JSON.parse(raw) as T) : null;
  } catch {
    value = null;
  }
  localCache.set(key, { raw, value });
  return value;
}

export function writeStored<T>(key: string, value: T | null) {
  if (SYNCED.has(key)) {
    const prev = memory.get(key) ?? null;
    memory.set(key, value);
    emit();
    if (hydrated) persist(key, prev, value);
    return;
  }
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
  emit();
}

export function useStored<T>(key: string): T | null | undefined {
  return useSyncExternalStore(
    subscribe,
    () => (SYNCED.has(key) && !hydrated ? undefined : readStored<T>(key)),
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
