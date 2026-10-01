import type { NextRequest } from "next/server";
import { getDb } from "@/lib/server/db";
import { assertSameOrigin, handler, requireUser } from "@/lib/server/http";

export const DELETE = handler(async (req: NextRequest) => {
  assertSameOrigin(req);
  const userId = await requireUser(req);
  const db = await getDb();
  await Promise.all(["profiles", "programs", "custom_exercises", "logs", "measurements"].map((c) => db.collection(c).deleteMany({ userId })));
  return Response.json({ ok: true });
});
