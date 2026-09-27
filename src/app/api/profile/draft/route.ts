import type { NextRequest } from "next/server";
import { getDb } from "@/lib/server/db";
import { assertSameOrigin, handler, readJson, requireUser } from "@/lib/server/http";
import { draftSchema } from "@/lib/server/schemas";

export const PUT = handler(async (req: NextRequest) => {
  assertSameOrigin(req);
  const userId = await requireUser(req);
  const draft = await readJson(req, draftSchema);
  await (await getDb()).collection("profiles").updateOne({ userId }, { $set: { draft, updatedAt: new Date() } }, { upsert: true });
  return Response.json({ ok: true });
});
