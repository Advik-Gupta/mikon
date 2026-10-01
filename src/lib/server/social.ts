import "server-only";
import { ObjectId } from "mongodb";
import { getDb } from "./db";
import { HttpError } from "./http";
import { sendPush } from "./push";
import { CARD_FIELDS, userCard, users, type UserDoc, type Visibility } from "./users";

export type Relation = "self" | "friends" | "outgoing" | "incoming" | "none";

export interface FriendshipDoc {
  _id: ObjectId;
  pair: string;
  users: [string, string];
  from: string;
  to: string;
  status: "pending" | "accepted";
  createdAt: Date;
  acceptedAt?: Date;
}

export const pairKey = (a: string, b: string) => [a, b].sort().join(":");
export const friendships = async () => (await getDb()).collection<FriendshipDoc>("friendships");

export async function relation(me: string, other: string): Promise<Relation> {
  if (me === other) return "self";
  const f = await (await friendships()).findOne({ pair: pairKey(me, other) });
  if (!f) return "none";
  if (f.status === "accepted") return "friends";
  return f.from === me ? "outgoing" : "incoming";
}

export async function friendIds(me: string) {
  const list = await (await friendships()).find({ users: me, status: "accepted" }, { projection: { users: 1 } }).toArray();
  return list.map((f) => (f.users[0] === me ? f.users[1] : f.users[0]));
}

export const canSee = (level: Visibility | undefined, rel: Relation) =>
  rel === "self" || level === "public" || (level === "friends" && rel === "friends");

export async function findByUsername(username: string) {
  if (!/^[a-z0-9_.]{3,24}$/.test(username)) throw new HttpError(404, "User not found");
  const u = await (await users()).findOne({ username });
  if (!u) throw new HttpError(404, "User not found");
  return u;
}

export async function cardsFor(ids: string[]) {
  const valid = ids.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  const list = await (await users()).find({ _id: { $in: valid } }, { projection: CARD_FIELDS }).toArray();
  return new Map(list.map((u) => [u._id.toHexString(), userCard(u)]));
}

export type NotificationType = "friend_request" | "friend_accept" | "program_shared" | "invite_joined";

export async function acceptInvite(user: UserDoc, inviterId: string) {
  const inviter = await (await users()).findOne({ _id: new ObjectId(inviterId) });
  if (!inviter || inviter._id.equals(user._id)) return;
  const a = inviter._id.toHexString();
  const b = user._id.toHexString();
  const now = new Date();
  await (await friendships()).updateOne(
    { pair: pairKey(a, b) },
    { $setOnInsert: { _id: new ObjectId(), pair: pairKey(a, b), users: [a, b], from: a, to: b, createdAt: now }, $set: { status: "accepted", acceptedAt: now } },
    { upsert: true },
  );
  await notify(a, user, "friend_accept", { title: `${user.name} added you as a friend`, body: `You and @${user.username} are now friends.`, url: `/u/${user.username}` });
}

export async function notify(userId: string, actor: UserDoc, type: NotificationType, text: { title: string; body: string; url: string }) {
  await (await getDb()).collection("notifications").insertOne({
    userId,
    actorId: actor._id.toHexString(),
    type,
    ...text,
    read: false,
    createdAt: new Date(),
  });
  await sendPush(userId, { ...text, tag: type }).catch(() => null);
}
