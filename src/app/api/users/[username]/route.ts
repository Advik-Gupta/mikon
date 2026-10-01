import type { NextRequest } from "next/server";
import { getDb } from "@/lib/server/db";
import { handler, requireUser } from "@/lib/server/http";
import { canSee, findByUsername, friendIds, relation } from "@/lib/server/social";
import { DEFAULT_PRIVACY, userCard } from "@/lib/server/users";

type Ctx = { params: Promise<{ username: string }> };

export const GET = handler(async (req: NextRequest, { params }: Ctx) => {
  const me = await requireUser(req);
  const user = await findByUsername((await params).username.toLowerCase());
  const id = user._id.toHexString();
  const rel = await relation(me, id);
  const privacy = { ...DEFAULT_PRIVACY, ...user.privacy };
  const open = canSee(privacy.profile, rel);
  const db = await getDb();

  const [friends, programs, workouts] = await Promise.all([
    friendIds(id),
    open ? db.collection("programs").find({ userId: id, "data.status": "ready" }).sort({ updatedAt: -1 }).toArray() : [],
    open && canSee(privacy.progress, rel)
      ? db.collection("logs").find({ userId: id, "data.completedAt": { $ne: null } }, { projection: { data: 1 } }).sort({ date: -1 }).limit(12).toArray()
      : null,
  ]);
  const active = programs.find((p) => p.data.activeFrom) ?? null;
  const shownActive = active && canSee(privacy.activeProgram, rel) ? active.data : null;
  const listed = programs.filter((p) => canSee(p.data.visibility ?? "private", rel) && p.id !== shownActive?.id).map((p) => p.data);

  return Response.json({
    user: { ...userCard(user), bio: open ? (user.bio ?? "") : "", joinedAt: user.createdAt },
    relation: rel,
    locked: !open,
    stats: { friends: friends.length, programs: programs.length, workouts: workouts?.length ?? null },
    activeProgram: shownActive,
    programs: listed,
    recent: workouts?.map((w) => w.data) ?? null,
    privacy: rel === "self" ? privacy : undefined,
  });
});
