import type { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { handler, HttpError, requireUser } from "@/lib/server/http";
import { compareSeries, logsFor } from "@/lib/server/progress";
import { canSee, cardsFor, friendIds } from "@/lib/server/social";
import { DEFAULT_PRIVACY, users } from "@/lib/server/users";

type Ctx = { params: Promise<{ exerciseId: string }> };

export const GET = handler(async (req: NextRequest, { params }: Ctx) => {
  const me = await requireUser(req);
  const { exerciseId } = await params;
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(exerciseId)) throw new HttpError(400, "Invalid id");
  const friends = await friendIds(me);
  const docs = await (await users())
    .find({ _id: { $in: friends.map((id) => new ObjectId(id)) } }, { projection: { privacy: 1 } })
    .toArray();
  const allowed = docs.filter((u) => canSee({ ...DEFAULT_PRIVACY, ...u.privacy }.progress, "friends")).map((u) => u._id.toHexString());
  const ids = [me, ...allowed];
  const byUser = await logsFor(ids, [exerciseId]);
  const { metric, series } = compareSeries(byUser, ids, exerciseId);
  const cards = await cardsFor(ids);
  return Response.json({
    metric,
    series: series.filter((s) => s.userId === me || s.points.length).map((s) => ({ user: cards.get(s.userId), self: s.userId === me, points: s.points })),
    hiddenFriends: friends.length - allowed.length,
  });
});
