import type { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { getDb } from "@/lib/server/db";
import { assertSameOrigin, handler, HttpError, readJson, requireAdmin } from "@/lib/server/http";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler(async (req: NextRequest, { params }: Ctx) => {
  assertSameOrigin(req);
  await requireAdmin(req);
  const { id } = await params;
  if (!ObjectId.isValid(id)) throw new HttpError(400, "Invalid id");
  const { status } = await readJson(req, z.object({ status: z.enum(["new", "planned", "done", "dismissed"]) }));
  await (await getDb()).collection("feedback").updateOne({ _id: new ObjectId(id) }, { $set: { status } });
  return Response.json({ ok: true });
});
