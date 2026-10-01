import type { NextRequest } from "next/server";
import { getDb } from "@/lib/server/db";
import { assertId, handler, HttpError, requireUser } from "@/lib/server/http";
import { canSee, findByUsername, relation } from "@/lib/server/social";
import { DEFAULT_PRIVACY, userCard } from "@/lib/server/users";

type Ctx = { params: Promise<{ username: string; id: string }> };

export const GET = handler(async (req: NextRequest, { params }: Ctx) => {
  const me = await requireUser(req);
  const { username, id } = await params;
  assertId(id);
  const user = await findByUsername(username.toLowerCase());
  const owner = user._id.toHexString();
  const rel = await relation(me, owner);
  const doc = await (await getDb()).collection("programs").findOne({ userId: owner, id });
  const privacy = { ...DEFAULT_PRIVACY, ...user.privacy };
  const p = doc?.data;
  const visible =
    p && p.status === "ready" && canSee(privacy.profile, rel) && (canSee(p.visibility ?? "private", rel) || (p.activeFrom && canSee(privacy.activeProgram, rel)));
  if (!visible) throw new HttpError(404, "Program not found");
  return Response.json({ owner: userCard(user), program: p });
});
