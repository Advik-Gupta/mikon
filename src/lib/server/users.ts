import "server-only";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { getDb } from "./db";
import { env } from "./env";
import { TOUR_VERSION } from "../tour-version";

export type Visibility = "private" | "friends" | "public";

export interface UserDoc {
  _id: ObjectId;
  email: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  avatarKey: string | null;
  bio: string;
  privacy: { profile: Visibility; activeProgram: Visibility; progress: Visibility };
  passwordHash: string;
  passwordChangedAt?: Date;
  role?: "user" | "admin";
  lastActiveAt?: Date;
  createdAt: Date;
  tutorial: { step: number; done: boolean; version?: number; newStep?: number; guides?: string[] };
}

export const DEFAULT_PRIVACY: UserDoc["privacy"] = { profile: "public", activeProgram: "friends", progress: "friends" };

const DUMMY_HASH = bcrypt.hashSync("timing-equaliser", 10);

export const users = async () => (await getDb()).collection<UserDoc>("users");

export const publicUser = (u: UserDoc) => ({
  id: u._id.toHexString(),
  email: u.email,
  name: u.name,
  username: u.username,
  avatarUrl: u.avatarUrl ?? null,
  bio: u.bio ?? "",
  privacy: { ...DEFAULT_PRIVACY, ...u.privacy },
  role: u.role === "admin" ? ("admin" as const) : ("user" as const),
  tutorial: u.tutorial,
});

export const userCard = (u: Pick<UserDoc, "_id" | "name" | "username" | "avatarUrl">) => ({
  id: u._id.toHexString(),
  name: u.name,
  username: u.username,
  avatarUrl: u.avatarUrl ?? null,
});

export const CARD_FIELDS = { name: 1, username: 1, avatarUrl: 1 } as const;

export async function usernameTaken(username: string, exceptId?: ObjectId) {
  const hit = await (await users()).findOne({ username }, { projection: { _id: 1 } });
  return !!hit && (!exceptId || !hit._id.equals(exceptId));
}

export async function ensureUsername(u: UserDoc) {
  if (u.username) return u;
  const base = u.email.split("@")[0].toLowerCase().replace(/[^a-z0-9_.]/g, "").slice(0, 18).padEnd(3, "0");
  let username = base;
  for (let i = 0; await usernameTaken(username); i++) username = `${base}${Math.floor(Math.random() * 9000 + 1000)}`;
  await (await users()).updateOne({ _id: u._id }, { $set: { username } });
  return { ...u, username };
}

export async function createUser(name: string, username: string, email: string, password: string) {
  const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
  const doc: UserDoc = {
    _id: new ObjectId(),
    email,
    name,
    username,
    avatarUrl: null,
    avatarKey: null,
    bio: "",
    privacy: DEFAULT_PRIVACY,
    passwordHash,
    createdAt: new Date(),
    tutorial: { step: 0, done: false, version: TOUR_VERSION },
  };
  await (await users()).insertOne(doc);
  return doc;
}

export async function checkCredentials(email: string, password: string) {
  const user = await (await users()).findOne(email.includes("@") ? { email } : { username: email });
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  return ok && user ? user : null;
}

export async function findUser(id: string) {
  if (!ObjectId.isValid(id)) return null;
  return (await users()).findOne({ _id: new ObjectId(id) });
}

export async function setPassword(userId: ObjectId, password: string) {
  const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
  await (await users()).updateOne({ _id: userId }, { $set: { passwordHash, passwordChangedAt: new Date() } });
}
