import "server-only";
import { getDb } from "./db";
import { bestValue, metricFor, type Metric } from "../metrics";
import type { WorkoutLog } from "../types";

const DAY = 86400000;
const iso = (d: Date) => d.toISOString().slice(0, 10);

export async function recentLogs(userIds: string[], days = 365) {
  const docs = await (await getDb())
    .collection("logs")
    .find({ userId: { $in: userIds }, date: { $gte: iso(new Date(Date.now() - days * DAY)) }, "data.completedAt": { $ne: null } }, { projection: { userId: 1, data: 1 } })
    .sort({ date: 1 })
    .limit(8000)
    .toArray();
  const byUser = new Map<string, WorkoutLog[]>(userIds.map((id) => [id, []]));
  docs.forEach((d) => byUser.get(d.userId)?.push(d.data as WorkoutLog));
  return byUser;
}

function weekStreak(logs: WorkoutLog[]) {
  const monday = (d: Date) => {
    const x = new Date(d);
    x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7));
    return iso(x);
  };
  const weeks = new Set(logs.map((l) => monday(new Date(`${l.date}T12:00:00Z`))));
  let cursor = new Date();
  if (!weeks.has(monday(cursor))) cursor = new Date(cursor.getTime() - 7 * DAY);
  let n = 0;
  while (weeks.has(monday(cursor))) {
    n++;
    cursor = new Date(cursor.getTime() - 7 * DAY);
  }
  return n;
}

export function totals(logs: WorkoutLog[]) {
  const since = iso(new Date(Date.now() - 30 * DAY));
  const recent = logs.filter((l) => l.date >= since);
  let sets = 0;
  let volume = 0;
  for (const l of recent)
    for (const x of l.exercises)
      for (const s of x.sets)
        if (s.done && s.kind !== "warmup") {
          sets++;
          volume += (s.weight ?? 0) * (s.reps ?? 0);
        }
  return {
    workouts: recent.length,
    sets,
    volume: Math.round(volume),
    minutes: Math.round(recent.reduce((a, l) => a + (l.durationSec ?? 0), 0) / 60),
    streak: weekStreak(logs),
    days: new Set(recent.map((l) => l.date)).size,
  };
}

export function exerciseCounts(logs: WorkoutLog[]) {
  const counts = new Map<string, number>();
  for (const l of logs) for (const id of new Set(l.exercises.filter((x) => x.sets.some((s) => s.done)).map((x) => x.exerciseId))) counts.set(id, (counts.get(id) ?? 0) + 1);
  return counts;
}

export function exerciseMetric(all: WorkoutLog[][], exerciseId: string): Metric {
  return metricFor(all.flatMap((logs) => logs.flatMap((l) => l.exercises.filter((x) => x.exerciseId === exerciseId).flatMap((x) => x.sets.filter((s) => s.done && s.kind !== "warmup")))));
}

export function bestAndGain(logs: WorkoutLog[], exerciseId: string, metric: Metric) {
  const points = logs
    .map((l) => {
      const vals = l.exercises.filter((x) => x.exerciseId === exerciseId).map((x) => bestValue(x.sets, metric)).filter((v): v is number => v != null);
      return vals.length ? Math.max(...vals) : null;
    })
    .filter((v): v is number => v != null);
  if (!points.length) return null;
  return { best: Math.max(...points), first: points[0], last: points.at(-1)!, sessions: points.length };
}

export async function weightSeries(userIds: string[], days = 180) {
  const docs = await (await getDb())
    .collection("measurements")
    .find({ userId: { $in: userIds }, metric: "weight" }, { projection: { userId: 1, data: 1 } })
    .limit(4000)
    .toArray();
  const since = new Date(Date.now() - days * DAY).toISOString();
  const byUser = new Map<string, { date: string; value: number }[]>(userIds.map((id) => [id, []]));
  for (const d of docs) {
    const m = d.data as { date: string; value: number };
    if (m.date >= since) byUser.get(d.userId)?.push({ date: m.date.slice(0, 10), value: m.value });
  }
  byUser.forEach((list) => list.sort((a, b) => a.date.localeCompare(b.date)));
  return byUser;
}
