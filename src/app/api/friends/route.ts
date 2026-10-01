import type { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { assertSameOrigin, handler, HttpError, rateLimit, readJson, requireUser } from "@/lib/server/http";
import { cardsFor, friendships, notify, pairKey } from "@/lib/server/social";
import { findUser } from "@/lib/server/users";

export const GET = handler(async (req: NextRequest) => {
  const me = await requireUser(req);
  const list = await (await friendships()).find({ users: me }).sort({ createdAt: -1 }).toArray();
  const other = (f: (typeof list)[number]) => (f.users[0] === me ? f.users[1] : f.users[0]);
  const cards = await cardsFor(list.map(other));
  const pick = (status: string, dir?: "in" | "out") =>
    list
      .filter((f) => f.status === status && (!dir || (dir === "in" ? f.to === me : f.from === me)))
      .map((f) => ({ ...cards.get(other(f))!, since: f.acceptedAt ?? f.createdAt }))
      .filter((c) => c.id);
  return Response.json({ friends: pick("accepted"), incoming: pick("pending", "in"), outgoing: pick("pending", "out") });
});

export const POST = handler(async (req: NextRequest) => {
  assertSameOrigin(req);
  const me = await requireUser(req);
  await rateLimit(`friend-req:${me}`, 40, 3600);
  const { userId } = await readJson(req, z.object({ userId: z.string().regex(/^[a-f0-9]{24}$/) }));
  if (userId === me) throw new HttpError(400, "You can't add yourself");
  const [actor, target] = await Promise.all([findUser(me), findUser(userId)]);
  if (!actor || !target) throw new HttpError(404, "User not found");
  const col = await friendships();
  const pair = pairKey(me, userId);
  const existing = await col.findOne({ pair });
  if (existing?.status === "accepted") return Response.json({ relation: "friends" });
  if (existing && existing.to === me) {
    await col.updateOne({ pair }, { $set: { status: "accepted", acceptedAt: new Date() } });
    await notify(userId, actor, "friend_accept", { title: `${actor.name} accepted your friend request`, body: `You and @${actor.username} are now friends.`, url: `/u/${actor.username}` });
    return Response.json({ relation: "friends" });
  }
  if (!existing) {
    await col.insertOne({ _id: new ObjectId(), pair, users: [me, userId], from: me, to: userId, status: "pending", createdAt: new Date() });
    await notify(userId, actor, "friend_request", { title: `${actor.name} sent you a friend request`, body: `@${actor.username} wants to connect on Mikon.`, url: "/friends?tab=requests" });
  }
  return Response.json({ relation: "outgoing" });
});
