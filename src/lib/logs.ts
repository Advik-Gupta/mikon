"use client";

import { EDITOR_KIND } from "@/data/activities";
import type { Exercise } from "./explorer";
import { KEYS, readStored, writeStored } from "./storage";
import type { LoggedSet, Program, WorkoutLog } from "./types";

export const findLog = (logs: WorkoutLog[] | null | undefined, programId: string, date: string) =>
  logs?.find((l) => l.programId === programId && l.date === date) ?? null;

export function planToLog(program: Program, dayIndex: number, date: string): WorkoutLog {
  const exercises = program.days[dayIndex].blocks
    .filter((b) => {
      const kind = EDITOR_KIND[b.type];
      return kind && kind !== "cardio" && kind !== "session" && kind !== "mobility";
    })
    .flatMap((b) => (b.entries ?? []).flatMap((e) => e.exercises))
    .map((x) => ({
      exerciseId: x.exerciseId,
      sets: x.sets
        .filter((s) => s.kind !== "warmup")
        .map((s): LoggedSet => ({ weight: s.weight, reps: s.reps, holdSec: s.holdSec ?? null, done: false })),
    }));
  return { id: crypto.randomUUID(), programId: program.id, date, dayIndex, exercises, notes: "", completedAt: null };
}

export function saveLog(log: WorkoutLog) {
  const list = readStored<WorkoutLog[]>(KEYS.logs) ?? [];
  const exists = list.some((l) => l.id === log.id);
  writeStored(KEYS.logs, exists ? list.map((l) => (l.id === log.id ? log : l)) : [log, ...list]);
}

export function deleteLog(id: string) {
  writeStored(
    KEYS.logs,
    (readStored<WorkoutLog[]>(KEYS.logs) ?? []).filter((l) => l.id !== id),
  );
}

export type Metric = "e1rm" | "reps" | "hold";

export const METRIC_LABEL: Record<Metric, string> = {
  e1rm: "Estimated 1 rep max",
  reps: "Best set reps",
  hold: "Longest hold",
};

export const metricFor = (ex: Pick<Exercise, "measure" | "discipline" | "equipment"> | undefined, sets: LoggedSet[]): Metric => {
  if (ex?.measure === "time" || sets.some((s) => s.holdSec && !s.reps)) return "hold";
  if (sets.some((s) => s.weight && s.weight > 0)) return "e1rm";
  return "reps";
};

export function bestValue(sets: LoggedSet[], metric: Metric) {
  const done = sets.filter((s) => s.done);
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

export function seriesFor(logs: WorkoutLog[], exerciseId: string, metric: Metric): Point[] {
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

export const logProgress = (l: WorkoutLog) => {
  const all = l.exercises.flatMap((x) => x.sets);
  return all.length ? all.filter((s) => s.done).length / all.length : 0;
};
