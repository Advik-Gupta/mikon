import type { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { assertSameOrigin, handler, HttpError, readJson, requireUser } from "@/lib/server/http";
import { meSchema } from "@/lib/server/schemas";
import { findUser, publicUser, usernameTaken, users } from "@/lib/server/users";

export const PATCH = handler(async (req: NextRequest) => {
  assertSameOrigin(req);
  const userId = await requireUser(req);
  const patch = await readJson(req, meSchema);
  const _id = new ObjectId(userId);
  if (patch.username && (await usernameTaken(patch.username, _id))) throw new HttpError(409, "That username is taken");
  if (Object.keys(patch).length) await (await users()).updateOne({ _id }, { $set: patch });
  const user = await findUser(userId);
  if (!user) throw new HttpError(401, "Not signed in");
  return Response.json({ user: publicUser(user) });
});
