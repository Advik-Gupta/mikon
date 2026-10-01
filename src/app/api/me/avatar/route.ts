import type { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { UTApi } from "uploadthing/server";
import { assertSameOrigin, handler, requireUser } from "@/lib/server/http";
import { users } from "@/lib/server/users";

export const DELETE = handler(async (req: NextRequest) => {
  assertSameOrigin(req);
  const userId = await requireUser(req);
  const col = await users();
  const _id = new ObjectId(userId);
  const prev = await col.findOneAndUpdate({ _id }, { $set: { avatarUrl: null, avatarKey: null } });
  if (prev?.avatarKey) await new UTApi().deleteFiles(prev.avatarKey).catch(() => null);
  return Response.json({ ok: true });
});
