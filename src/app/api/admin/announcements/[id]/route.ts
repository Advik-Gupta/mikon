import type { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { getDb } from "@/lib/server/db";
import { assertSameOrigin, handler, HttpError, readJson, requireAdmin } from "@/lib/server/http";
import { clearCache } from "@/lib/server/admin";

type Ctx = { params: Promise<{ id: string }> };

const id = async (p: Ctx["params"]) => {
  const { id } = await p;
  if (!ObjectId.isValid(id)) throw new HttpError(400, "Invalid id");
  return new ObjectId(id);
};

export const PATCH = handler(async (req: NextRequest, { params }: Ctx) => {
  assertSameOrigin(req);
  await requireAdmin(req);
  const { active } = await readJson(req, z.object({ active: z.boolean() }));
  await (await getDb()).collection("announcements").updateOne({ _id: await id(params) }, { $set: { active } });
  clearCache("announcements");
  return Response.json({ ok: true });
});

export const DELETE = handler(async (req: NextRequest, { params }: Ctx) => {
  assertSameOrigin(req);
  await requireAdmin(req);
  await (await getDb()).collection("announcements").deleteOne({ _id: await id(params) });
  clearCache("announcements");
  return Response.json({ ok: true });
});
