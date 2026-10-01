import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { ObjectId } from "mongodb";
import { getDb } from "./db";

const TTL_MIN = 30;
const hash = (token: string) => createHash("sha256").update(token).digest("hex");
const resets = async () => (await getDb()).collection<{ userId: ObjectId; tokenHash: string; expiresAt: Date; createdAt: Date }>("password_resets");

export async function createReset(userId: ObjectId) {
  const token = randomBytes(32).toString("base64url");
  const col = await resets();
  await col.deleteMany({ userId });
  await col.insertOne({ userId, tokenHash: hash(token), expiresAt: new Date(Date.now() + TTL_MIN * 60_000), createdAt: new Date() });
  return token;
}

export async function consumeReset(token: string) {
  const doc = await (await resets()).findOneAndDelete({ tokenHash: hash(token), expiresAt: { $gt: new Date() } });
  if (doc) await (await resets()).deleteMany({ userId: doc.userId });
  return doc?.userId ?? null;
}

export async function resetIsValid(token: string) {
  return !!(await (await resets()).findOne({ tokenHash: hash(token), expiresAt: { $gt: new Date() } }, { projection: { _id: 1 } }));
}
