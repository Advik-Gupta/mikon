import type { LoggedSet, WorkoutLog } from "./types";

export type Metric = "e1rm" | "reps" | "hold";

export const METRIC_LABEL: Record<Metric, string> = {
  e1rm: "Estimated 1 rep max",
  reps: "Best set reps",
  hold: "Longest hold",
};

export const metricFor = (sets: LoggedSet[]): Metric => {
  if (sets.some((s) => s.holdSec && !s.reps)) return "hold";
  if (sets.some((s) => s.weight && s.weight > 0)) return "e1rm";
  return "reps";
};

export function bestValue(sets: LoggedSet[], metric: Metric) {
  const done = sets.filter((s) => s.done && s.kind !== "warmup");
  if (!done.length) return null;
  if (metric === "hold") return Math.max(...done.map((s) => s.holdSec ?? 0)) || null;
  if (metric === "reps") return Math.max(...done.map((s) => s.reps ?? 0)) || null;
  const e1rm = done.filter((s) => s.weight && s.reps).map((s) => s.weight! * (1 + Math.min(s.reps!, 15) / 30));
  return e1rm.length ? Math.round(Math.max(...e1rm) * 10) / 10 : null;
}

export interface Point {
  date: string;
  value: number;
}

export function seriesFor(logs: Pick<WorkoutLog, "date" | "exercises">[], exerciseId: string, metric: Metric): Point[] {
  const byDate = new Map<string, number>();
  for (const l of logs) {
    for (const x of l.exercises) {
      if (x.exerciseId !== exerciseId) continue;
      const v = bestValue(x.sets, metric);
      if (v != null) byDate.set(l.date, Math.max(byDate.get(l.date) ?? 0, v));
    }
  }
  return [...byDate.entries()].map(([date, value]) => ({ date, value })).sort((a, b) => a.date.localeCompare(b.date));
}

export const setsFor = (logs: Pick<WorkoutLog, "exercises">[], exerciseId: string) =>
  logs.flatMap((l) => l.exercises.filter((x) => x.exerciseId === exerciseId).flatMap((x) => x.sets.filter((s) => s.done && s.kind !== "warmup")));

export function metricFormat(metric: Metric, units: "metric" | "imperial") {
  if (metric === "hold") return (v: number) => `${Math.round(v)}s`;
  if (metric === "reps") return (v: number) => `${Math.round(v)}`;
  return (v: number) => (units === "metric" ? `${Math.round(v)} kg` : `${Math.round(v * 2.20462)} lb`);
}

export const METRIC_UNIT: Record<Metric, string> = { e1rm: "estimated 1RM", reps: "reps in best set", hold: "longest hold" };
