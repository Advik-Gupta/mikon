import type { NextRequest } from "next/server";
import { z } from "zod";
import { assertSameOrigin, handler, HttpError, readJson, requireUser } from "@/lib/server/http";
import { friendships, notify, pairKey } from "@/lib/server/social";
import { findUser } from "@/lib/server/users";

type Ctx = { params: Promise<{ userId: string }> };

async function target(params: Ctx["params"]) {
  const { userId } = await params;
  if (!/^[a-f0-9]{24}$/.test(userId)) throw new HttpError(400, "Invalid id");
  return userId;
}

export const PATCH = handler(async (req: NextRequest, { params }: Ctx) => {
  assertSameOrigin(req);
  const me = await requireUser(req);
  const other = await target(params);
  const { action } = await readJson(req, z.object({ action: z.enum(["accept", "decline"]) }));
  const col = await friendships();
  const f = await col.findOne({ pair: pairKey(me, other), status: "pending", to: me });
  if (!f) throw new HttpError(404, "No pending request");
  if (action === "decline") {
    await col.deleteOne({ _id: f._id });
    return Response.json({ relation: "none" });
  }
  await col.updateOne({ _id: f._id }, { $set: { status: "accepted", acceptedAt: new Date() } });
  const actor = await findUser(me);
  if (actor) {
    await notify(other, actor, "friend_accept", { title: `${actor.name} accepted your friend request`, body: `You and @${actor.username} are now friends.`, url: `/u/${actor.username}` });
  }
  return Response.json({ relation: "friends" });
});

export const DELETE = handler(async (req: NextRequest, { params }: Ctx) => {
  assertSameOrigin(req);
  const me = await requireUser(req);
  const other = await target(params);
  await (await friendships()).deleteOne({ pair: pairKey(me, other) });
  return Response.json({ relation: "none" });
});
