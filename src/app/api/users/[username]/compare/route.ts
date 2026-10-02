import type { NextRequest } from "next/server";
import { getDb } from "@/lib/server/db";
import { handler, requireUser } from "@/lib/server/http";
import { allExerciseIds, compareSeries } from "@/lib/server/progress";
import { canSee, findByUsername, relation } from "@/lib/server/social";
import { DEFAULT_PRIVACY } from "@/lib/server/users";
import { exerciseCounts, recentLogs, totals, weightSeries } from "@/lib/server/versus";

type Ctx = { params: Promise<{ username: string }> };

export const GET = handler(async (req: NextRequest, { params }: Ctx) => {
  const me = await requireUser(req);
  const user = await findByUsername((await params).username.toLowerCase());
  const them = user._id.toHexString();
  const rel = await relation(me, them);
  const privacy = { ...DEFAULT_PRIVACY, ...user.privacy };
  const empty = { exercises: [], source: "logs", weight: null, totals: null };
  if (rel === "self") return Response.json({ status: "self", ...empty });
  if (!canSee(privacy.profile, rel)) return Response.json({ status: "hidden", ...empty });
  if (!canSee(privacy.progress, rel)) return Response.json({ status: "progress-hidden", ...empty });

  const db = await getDb();
  const active = (id: string) => db.collection("programs").findOne({ userId: id, "data.status": "ready", "data.activeFrom": { $nin: [null, ""] } }, { projection: { data: 1 } });
  const [mine, theirs, byUser, weights] = await Promise.all([active(me), canSee(privacy.activeProgram, rel) ? active(them) : null, recentLogs([me, them]), weightSeries([me, them])]);
  const myLogs = byUser.get(me) ?? [];
  const theirLogs = byUser.get(them) ?? [];

  const myCounts = exerciseCounts(myLogs);
  const theirCounts = exerciseCounts(theirLogs);
  const logged = [...myCounts.keys()].filter((id) => theirCounts.has(id)).sort((a, b) => Math.min(myCounts.get(b)!, theirCounts.get(b)!) - Math.min(myCounts.get(a)!, theirCounts.get(a)!));
  const theirIds = allExerciseIds(theirs?.data);
  const planned = mine && theirs ? [...allExerciseIds(mine.data)].filter((id) => theirIds.has(id)) : [];
  const source = planned.length ? "programs" : "logs";
  const ids = [...new Set([...planned, ...logged])].slice(0, 40);

  const myWeight = weights.get(me) ?? [];
  const theirWeight = weights.get(them) ?? [];
  return Response.json({
    status: "ok",
    source,
    exercises: ids.map((exerciseId) => {
      const { metric, series } = compareSeries(byUser, [me, them], exerciseId);
      return { exerciseId, metric, mine: series[0].points, theirs: series[1].points };
    }),
    weight: myWeight.length && theirWeight.length ? { mine: myWeight, theirs: theirWeight } : null,
    totals: { mine: totals(myLogs), theirs: totals(theirLogs) },
  });
});
