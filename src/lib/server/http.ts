import "server-only";
import { cookies } from "next/headers";
import { after, NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { ZodError, type z } from "zod";
import { getDb } from "./db";
import { env } from "./env";
import { KNOWN_COOKIE, SESSION_COOKIE, sessionClaims, signSession, verifySession, type Role } from "./session";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const fail = (status: number, message: string) => NextResponse.json({ error: message }, { status });

const QUIET = /^\/api\/(notifications|friends|exercises|health)$/;

function logRequest(req: NextRequest, status: number, started: number, error?: string) {
  const path = req.nextUrl.pathname;
  if (req.method === "GET" && status < 400 && QUIET.test(path)) return;
  after(async () => {
    try {
      const claims = await sessionClaims(req.cookies.get(SESSION_COOKIE)?.value, process.env.JWT_SECRET ?? "");
      const ua = req.headers.get("user-agent") ?? "";
      await (await getDb()).collection("request_logs").insertOne({
        ts: new Date(started),
        method: req.method,
        path: path.replace(/\/[0-9a-f]{24}(?=\/|$)/g, "/:id").replace(/\/[0-9a-f-]{36}(?=\/|$)/g, "/:id").slice(0, 160),
        rawPath: path.slice(0, 200),
        status,
        ms: Date.now() - started,
        userId: claims?.sub ?? null,
        device: /mobile|iphone|android/i.test(ua) ? "mobile" : "desktop",
        error: error?.slice(0, 300),
      });
    } catch {}
  });
}

export function handler<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A) => {
    const req = args[0] as NextRequest;
    const started = Date.now();
    try {
      const res = await fn(...args);
      logRequest(req, res.status, started);
      return res;
    } catch (e) {
      if (e instanceof HttpError) {
        logRequest(req, e.status, started, e.message);
        return fail(e.status, e.message);
      }
      if (e instanceof ZodError) {
        console.error("Invalid server config:", e.issues.map((i) => i.path.join(".")).join(", "));
        logRequest(req, 503, started, "config");
        return fail(503, "Mikon isn't set up correctly on the server yet. Please try again later.");
      }
      console.error(e);
      logRequest(req, 500, started, (e as Error).message);
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

const seenToday = new Set<string>();

function markActive(userId: string) {
  const day = new Date().toISOString().slice(0, 10);
  const key = `${userId}:${day}`;
  if (seenToday.has(key)) return;
  if (seenToday.size > 5000) seenToday.clear();
  seenToday.add(key);
  after(async () => {
    try {
      const db = await getDb();
      await Promise.all([
        db.collection("user_days").updateOne({ userId, day }, { $setOnInsert: { userId, day, at: new Date() } }, { upsert: true }),
        ObjectId.isValid(userId) && db.collection("users").updateOne({ _id: new ObjectId(userId) }, { $set: { lastActiveAt: new Date() } }),
      ]);
    } catch {}
  });
}

export async function requireUser(req: NextRequest) {
  const userId = await verifySession(req.cookies.get(SESSION_COOKIE)?.value, env.JWT_SECRET);
  if (!userId) throw new HttpError(401, "Not signed in");
  await rateLimit(`api:${userId}`, env.RATE_LIMIT_API_MAX, env.RATE_LIMIT_API_WINDOW_SEC);
  markActive(userId);
  return userId;
}

const roleCache = new Map<string, { role: Role; at: number }>();

export async function requireAdmin(req: NextRequest) {
  const userId = await requireUser(req);
  const hit = roleCache.get(userId);
  let role = hit && Date.now() - hit.at < 30_000 ? hit.role : null;
  if (!role) {
    const u = await (await getDb()).collection("users").findOne({ _id: new ObjectId(userId) }, { projection: { role: 1 } });
    role = u?.role === "admin" ? "admin" : "user";
    if (role === "admin") roleCache.set(userId, { role, at: Date.now() });
  }
  if (role !== "admin") throw new HttpError(404, "Not found");
  return userId;
}

export const forgetRole = (userId: string) => roleCache.delete(userId);

export async function startSession(userId: string, role: Role = "user") {
  const token = await signSession(userId, env.JWT_SECRET, env.SESSION_TTL_DAYS, role);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: env.SESSION_TTL_DAYS * 86400,
  });
  (await cookies()).set(KNOWN_COOKIE, "1", { path: "/", sameSite: "lax", maxAge: 400 * 86400 });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}
