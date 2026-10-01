"use client";

import { useEffect, useSyncExternalStore } from "react";

interface Entry {
  data?: unknown;
  error?: string;
  loading: boolean;
  at: number;
}

const entries = new Map<string, Entry>();
const inflight = new Map<string, Promise<void>>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

export async function apiSend<T = unknown>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 401) window.location.replace("/login");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as T;
}

function load(url: string) {
  if (inflight.has(url)) return inflight.get(url)!;
  const prev = entries.get(url);
  entries.set(url, { ...prev, loading: true, at: prev?.at ?? 0 });
  emit();
  const p = apiSend("GET", url)
    .then((data) => void entries.set(url, { data, loading: false, at: Date.now() }))
    .catch((e: Error) => void entries.set(url, { ...entries.get(url), error: e.message, loading: false, at: Date.now() }))
    .finally(() => {
      inflight.delete(url);
      emit();
    });
  inflight.set(url, p);
  return p;
}

export function revalidate(prefix: string) {
  [...entries.keys()].filter((k) => k.startsWith(prefix)).forEach((k) => load(k));
}

export function useApi<T>(url: string | null, maxAgeMs = 15_000) {
  const entry = useSyncExternalStore(
    subscribe,
    () => (url ? entries.get(url) : undefined),
    () => undefined,
  );
  useEffect(() => {
    if (!url) return;
    const e = entries.get(url);
    if (!e || (!e.loading && Date.now() - e.at > maxAgeMs)) load(url);
  }, [url, maxAgeMs]);
  return {
    data: entry?.data as T | undefined,
    error: entry?.error,
    loading: !entry || (entry.loading && entry.data === undefined),
    reload: () => url && load(url),
  };
}

export interface UserCard {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
}

export type Relation = "self" | "friends" | "outgoing" | "incoming" | "none";
