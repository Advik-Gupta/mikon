import type { NextRequest } from "next/server";
import { getDb } from "@/lib/server/db";
import { assertId, assertSameOrigin, handler, HttpError, readJson, requireUser } from "@/lib/server/http";
import { logSchema } from "@/lib/server/schemas";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = handler(async (req: NextRequest, { params }: Ctx) => {
  assertSameOrigin(req);
  const userId = await requireUser(req);
  const { id } = await params;
  assertId(id);
  const data = await readJson(req, logSchema);
  if (data.id !== id) throw new HttpError(400, "Id mismatch");
  await (await getDb())
    .collection("logs")
    .updateOne({ userId, id }, { $set: { data, date: data.date, exerciseIds: data.exercises.map((e) => e.exerciseId), updatedAt: new Date() } }, { upsert: true });
  return Response.json({ ok: true });
});

export const DELETE = handler(async (req: NextRequest, { params }: Ctx) => {
  assertSameOrigin(req);
  const userId = await requireUser(req);
  const { id } = await params;
  assertId(id);
  await (await getDb()).collection("logs").deleteOne({ userId, id });
  return Response.json({ ok: true });
});
