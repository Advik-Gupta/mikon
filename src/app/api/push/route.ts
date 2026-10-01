import type { NextRequest } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/server/db";
import { assertSameOrigin, handler, readJson, requireUser } from "@/lib/server/http";

const endpoint = z.string().url().startsWith("https://").max(1000);
const subSchema = z.object({ endpoint, keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }) });

export const POST = handler(async (req: NextRequest) => {
  assertSameOrigin(req);
  const userId = await requireUser(req);
  const sub = await readJson(req, subSchema);
  await (await getDb())
    .collection("push_subscriptions")
    .updateOne({ endpoint: sub.endpoint }, { $set: { userId, keys: sub.keys, updatedAt: new Date() } }, { upsert: true });
  return Response.json({ ok: true });
});

export const DELETE = handler(async (req: NextRequest) => {
  assertSameOrigin(req);
  const userId = await requireUser(req);
  const { endpoint: url } = await readJson(req, z.object({ endpoint }));
  await (await getDb()).collection("push_subscriptions").deleteOne({ endpoint: url, userId });
  return Response.json({ ok: true });
});
