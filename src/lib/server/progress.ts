import "server-only";
import { getDb } from "./db";
import { metricFor, seriesFor, setsFor, type Metric } from "../metrics";
import type { WorkoutLog } from "../types";

export async function logsFor(userIds: string[], exerciseIds: string[]) {
  const docs = await (await getDb())
    .collection("logs")
    .find({ userId: { $in: userIds }, exerciseIds: { $in: exerciseIds } }, { projection: { userId: 1, data: 1 } })
    .sort({ date: 1 })
    .limit(5000)
    .toArray();
  const byUser = new Map<string, WorkoutLog[]>();
  docs.forEach((d) => byUser.set(d.userId, [...(byUser.get(d.userId) ?? []), d.data as WorkoutLog]));
  return byUser;
}

export function compareSeries(byUser: Map<string, WorkoutLog[]>, userIds: string[], exerciseId: string) {
  const all = userIds.flatMap((id) => setsFor(byUser.get(id) ?? [], exerciseId));
  const metric: Metric = metricFor(all);
  return { metric, series: userIds.map((id) => ({ userId: id, points: seriesFor(byUser.get(id) ?? [], exerciseId, metric) })) };
}

export const allExerciseIds = (program: { days?: { blocks?: { entries?: { exercises?: { exerciseId: string }[] }[] }[] }[] } | null | undefined) =>
  new Set((program?.days ?? []).flatMap((d) => (d.blocks ?? []).flatMap((b) => (b.entries ?? []).flatMap((e) => (e.exercises ?? []).map((x) => x.exerciseId)))));
