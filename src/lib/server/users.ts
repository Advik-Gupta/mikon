import "server-only";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { getDb } from "./db";
import { env } from "./env";

export interface UserDoc {
  _id: ObjectId;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: Date;
  tutorial: { step: number; done: boolean };
}

const DUMMY_HASH = bcrypt.hashSync("timing-equaliser", 10);

export const users = async () => (await getDb()).collection<UserDoc>("users");

export const publicUser = (u: UserDoc) => ({ id: u._id.toHexString(), email: u.email, name: u.name, tutorial: u.tutorial });

export async function createUser(name: string, email: string, password: string) {
  const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
  const doc = { _id: new ObjectId(), email, name, passwordHash, createdAt: new Date(), tutorial: { step: 0, done: false } };
  await (await users()).insertOne(doc);
  return doc;
}

/** Always runs a bcrypt comparison so response time doesn't reveal whether the email exists. */
export async function checkCredentials(email: string, password: string) {
  const user = await (await users()).findOne({ email });
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  return ok && user ? user : null;
}

export async function findUser(id: string) {
  if (!ObjectId.isValid(id)) return null;
  return (await users()).findOne({ _id: new ObjectId(id) });
}
