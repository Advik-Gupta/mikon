import type { NextRequest } from "next/server";
import { getDb } from "@/lib/server/db";
import { assertSameOrigin, handler, readJson, requireUser } from "@/lib/server/http";
import { profileSchema } from "@/lib/server/schemas";

export const PUT = handler(async (req: NextRequest) => {
  assertSameOrigin(req);
  const userId = await requireUser(req);
  const profile = await readJson(req, profileSchema);
  await (await getDb()).collection("profiles").updateOne({ userId }, { $set: { profile, updatedAt: new Date() } }, { upsert: true });
  return Response.json({ ok: true });
});

export const DELETE = handler(async (req: NextRequest) => {
  assertSameOrigin(req);
  const userId = await requireUser(req);
  await (await getDb()).collection("profiles").deleteOne({ userId });
  return Response.json({ ok: true });
});
