import "server-only";
import { z } from "zod";
import type { NextRequest } from "next/server";

const cache = globalThis as unknown as { adminCache?: Map<string, { at: number; value: Promise<unknown> }> };

export function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  cache.adminCache ??= new Map();
  const hit = cache.adminCache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as Promise<T>;
  const value = fn();
  cache.adminCache.set(key, { at: Date.now(), value });
  value.catch(() => cache.adminCache?.delete(key));
  return value;
}

export const clearCache = (prefix: string) => [...(cache.adminCache?.keys() ?? [])].filter((k) => k.startsWith(prefix)).forEach((k) => cache.adminCache?.delete(k));

const pageSchema = z.object({
  page: z.coerce.number().int().min(0).max(100000).default(0),
  pageSize: z.coerce.number().int().min(5).max(100).default(25),
  sort: z.string().regex(/^[a-zA-Z.]{1,40}$/).optional(),
  dir: z.enum(["asc", "desc"]).default("desc"),
  q: z.string().max(100).optional(),
});

export function paging(req: NextRequest) {
  const p = pageSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  return p.success ? p.data : pageSchema.parse({});
}

export const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const daysAgo = (n: number) => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
};

export const dayKeys = (n: number) => Array.from({ length: n }, (_, i) => daysAgo(n - 1 - i).toISOString().slice(0, 10));
