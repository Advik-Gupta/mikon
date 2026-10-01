import type { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { assertSameOrigin, handler, HttpError, readJson, requireUser } from "@/lib/server/http";
import { acceptInvite } from "@/lib/server/social";
import { findUser, users } from "@/lib/server/users";

export const POST = handler(async (req: NextRequest) => {
  assertSameOrigin(req);
  const userId = await requireUser(req);
  const { accept } = await readJson(req, z.object({ accept: z.boolean() }));
  const user = await findUser(userId);
  if (!user) throw new HttpError(401, "Not signed in");
  if (user.invite?.status !== "pending") return Response.json({ ok: true });
  if (accept) await acceptInvite(user, user.invite.from);
  await (await users()).updateOne({ _id: new ObjectId(userId) }, { $set: { "invite.status": accept ? "accepted" : "skipped" } });
  return Response.json({ ok: true });
});
