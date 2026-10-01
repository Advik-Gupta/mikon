import type { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { UTApi } from "uploadthing/server";
import { getDb } from "@/lib/server/db";
import { assertSameOrigin, forgetRole, handler, HttpError, readJson, requireAdmin } from "@/lib/server/http";
import { clearCache } from "@/lib/server/admin";

type Ctx = { params: Promise<{ id: string }> };

async function target(params: Ctx["params"]) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) throw new HttpError(400, "Invalid id");
  return id;
}

export const PATCH = handler(async (req: NextRequest, { params }: Ctx) => {
  assertSameOrigin(req);
  const me = await requireAdmin(req);
  const id = await target(params);
  const { role } = await readJson(req, z.object({ role: z.enum(["user", "admin"]) }));
  const users = (await getDb()).collection("users");
  if (role === "user" && (await users.countDocuments({ role: "admin" })) <= 1 && id === me) throw new HttpError(400, "You're the last admin");
  await users.updateOne({ _id: new ObjectId(id) }, { $set: { role } });
  forgetRole(id);
  clearCache("overview");
  return Response.json({ ok: true });
});

export const DELETE = handler(async (req: NextRequest, { params }: Ctx) => {
  assertSameOrigin(req);
  const me = await requireAdmin(req);
  const id = await target(params);
  if (id === me) throw new HttpError(400, "You can't delete your own account here");
  const db = await getDb();
  const user = await db.collection("users").findOne({ _id: new ObjectId(id) });
  if (!user) throw new HttpError(404, "User not found");
  await Promise.all([
    ...["profiles", "programs", "custom_exercises", "logs", "measurements", "notifications", "push_subscriptions", "user_days", "feedback"].map((c) => db.collection(c).deleteMany({ userId: id })),
    db.collection("friendships").deleteMany({ users: id }),
    db.collection("shares").deleteMany({ $or: [{ from: id }, { to: id }] }),
    db.collection("users").deleteOne({ _id: user._id }),
  ]);
  if (user.avatarKey) await new UTApi().deleteFiles(user.avatarKey).catch(() => null);
  clearCache("overview");
  return Response.json({ ok: true });
});
