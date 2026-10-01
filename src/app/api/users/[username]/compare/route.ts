import type { NextRequest } from "next/server";
import { getDb } from "@/lib/server/db";
import { handler, requireUser } from "@/lib/server/http";
import { allExerciseIds, compareSeries, logsFor } from "@/lib/server/progress";
import { canSee, findByUsername, relation } from "@/lib/server/social";
import { DEFAULT_PRIVACY } from "@/lib/server/users";

type Ctx = { params: Promise<{ username: string }> };

export const GET = handler(async (req: NextRequest, { params }: Ctx) => {
  const me = await requireUser(req);
  const user = await findByUsername((await params).username.toLowerCase());
  const them = user._id.toHexString();
  const rel = await relation(me, them);
  const privacy = { ...DEFAULT_PRIVACY, ...user.privacy };
  if (rel === "self") return Response.json({ status: "self", exercises: [] });
  if (!canSee(privacy.profile, rel) || !canSee(privacy.activeProgram, rel)) return Response.json({ status: "hidden", exercises: [] });

  const db = await getDb();
  const active = (id: string) => db.collection("programs").findOne({ userId: id, "data.status": "ready", "data.activeFrom": { $nin: [null, ""] } });
  const [mine, theirs] = await Promise.all([active(me), active(them)]);
  if (!mine || !theirs) return Response.json({ status: !mine ? "no-active-self" : "no-active-them", exercises: [] });

  const theirIds = allExerciseIds(theirs.data);
  const common = [...allExerciseIds(mine.data)].filter((id) => theirIds.has(id));
  const progressOpen = canSee(privacy.progress, rel);
  const byUser = progressOpen ? await logsFor([me, them], common) : new Map();
  return Response.json({
    status: progressOpen ? "ok" : "progress-hidden",
    exercises: common.map((exerciseId) => {
      const { metric, series } = compareSeries(byUser, [me, them], exerciseId);
      return { exerciseId, metric, mine: series[0].points, theirs: progressOpen ? series[1].points : [] };
    }),
  });
});
