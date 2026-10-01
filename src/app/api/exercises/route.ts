import type { NextRequest } from "next/server";
import { getDb } from "@/lib/server/db";
import { env } from "@/lib/server/env";
import { handler, requireUser } from "@/lib/server/http";

const TTL = 10 * 60 * 1000;
const cache = globalThis as unknown as { exerciseLibrary?: { at: number; body: Promise<string> } };

function library() {
  const hit = cache.exerciseLibrary;
  if (hit && Date.now() - hit.at < TTL) return hit.body;
  const body = (async () => {
    const exercises = await (await getDb()).collection("exercises").find({}, { projection: { _id: 0 } }).sort({ name: 1 }).toArray();
    return JSON.stringify({ imageBase: env.NEXT_PUBLIC_EXERCISE_IMAGE_BASE, exercises });
  })();
  cache.exerciseLibrary = { at: Date.now(), body };
  body.catch(() => (cache.exerciseLibrary = undefined));
  return body;
}

export const GET = handler(async (req: NextRequest) => {
  await requireUser(req);
  return new Response(await library(), { headers: { "Content-Type": "application/json", "Cache-Control": "private, max-age=300" } });
});
