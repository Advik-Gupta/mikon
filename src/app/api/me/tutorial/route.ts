import { ObjectId } from "mongodb";
import type { NextRequest } from "next/server";
import { assertSameOrigin, handler, readJson, requireUser } from "@/lib/server/http";
import { tutorialSchema } from "@/lib/server/schemas";
import { users } from "@/lib/server/users";

export const PATCH = handler(async (req: NextRequest) => {
  assertSameOrigin(req);
  const userId = await requireUser(req);
  const tutorial = await readJson(req, tutorialSchema);
  await (await users()).updateOne({ _id: new ObjectId(userId) }, { $set: { tutorial } });
  return Response.json({ tutorial });
});
