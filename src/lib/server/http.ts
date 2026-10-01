import "server-only";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type z } from "zod";
import { getDb } from "./db";
import { env } from "./env";
import { SESSION_COOKIE, signSession, verifySession } from "./session";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const fail = (status: number, message: string) => NextResponse.json({ error: message }, { status });

export function handler<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A) => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof HttpError) return fail(e.status, e.message);
      if (e instanceof ZodError) {
        console.error("Invalid server config:", e.issues.map((i) => i.path.join(".")).join(", "));
        return fail(503, "Mikon isn't set up correctly on the server yet. Please try again later.");
      }
      console.error(e);
      return fail(500, "Something went wrong");
    }
  };
}

export function clientIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}

export function assertSameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) throw new HttpError(403, "Forbidden");
}

export async function rateLimit(bucket: string, max: number, windowSec: number) {
  const db = await getDb();
  const now = Date.now();
  const windowStart = Math.floor(now / (windowSec * 1000)) * windowSec * 1000;
  const id = `${bucket}:${windowStart}`;
  const doc = await db
    .collection<{ _id: string; count: number; expiresAt: Date }>("rate_limits")
    .findOneAndUpdate(
      { _id: id },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(windowStart + windowSec * 1000) } },
      { upsert: true, returnDocument: "after" },
    );
  if ((doc?.count ?? 0) > max) {
    const retry = Math.ceil((windowStart + windowSec * 1000 - now) / 1000);
    throw new HttpError(429, `Too many requests. Try again in ${retry < 60 ? `${retry}s` : `${Math.ceil(retry / 60)} min`}.`);
  }
}

function assertSafeKeys(value: unknown, depth = 0): void {
  if (depth > 40) throw new HttpError(400, "Payload too deep");
  if (Array.isArray(value)) return value.forEach((v) => assertSafeKeys(v, depth + 1));
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (k.startsWith("$") || k.includes(".") || k === "__proto__" || k === "constructor") throw new HttpError(400, "Invalid field name");
      assertSafeKeys(v, depth + 1);
    }
  }
}

export async function readJson<T extends z.ZodType>(req: NextRequest, schema: T): Promise<z.infer<T>> {
  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > env.MAX_BODY_KB * 1024) throw new HttpError(413, "Payload too large");
  const text = await req.text();
  if (text.length > env.MAX_BODY_KB * 1024) throw new HttpError(413, "Payload too large");
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new HttpError(400, "Invalid JSON");
  }
  assertSafeKeys(body);
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid request");
  return parsed.data;
}

export const ID = /^[A-Za-z0-9_-]{1,80}$/;

export function assertId(id: string) {
  if (!ID.test(id)) throw new HttpError(400, "Invalid id");
}

export async function requireUser(req: NextRequest) {
  const userId = await verifySession(req.cookies.get(SESSION_COOKIE)?.value, env.JWT_SECRET);
  if (!userId) throw new HttpError(401, "Not signed in");
  await rateLimit(`api:${userId}`, env.RATE_LIMIT_API_MAX, env.RATE_LIMIT_API_WINDOW_SEC);
  return userId;
}

export async function startSession(userId: string) {
  const token = await signSession(userId, env.JWT_SECRET, env.SESSION_TTL_DAYS);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: env.SESSION_TTL_DAYS * 86400,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}
