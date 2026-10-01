"use client";

import { EDITOR_KIND } from "@/data/activities";
import { KEYS, readStored, writeStored } from "./storage";
import type { LoggedSet, Program, WorkoutLog } from "./types";

export * from "./metrics";

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

export const logProgress = (l: WorkoutLog) => {
  const all = l.exercises.flatMap((x) => x.sets);
  return all.length ? all.filter((s) => s.done).length / all.length : 0;
};
