"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { EDITOR_KIND } from "@/data/activities";
import type { Exercise } from "./explorer";
import { bestValue, metricFor } from "./metrics";
import { dayLabel, toISODate } from "./programs";
import { KEYS, readStored, writeStored } from "./storage";
import type { LoggedSet, Program, SetKind, WorkoutLog } from "./types";

const KEY = "mikon.active-workout.v1";
const PENDING = "mikon.pending-logs.v1";

export interface TrackSet {
  id: string;
  kind: SetKind;
  weight: number | null;
  reps: number | null;
  holdSec: number | null;
  rir: number | null;
  done: boolean;
  timed?: boolean;
}

export interface TrackExercise {
  id: string;
  exerciseId: string;
  sets: TrackSet[];
  note: string;
  restSec: number;
  supersetId?: string;
}

export interface ActiveWorkout {
  id: string;
  userId: string;
  name: string;
  programId: string | null;
  dayIndex: number | null;
  date: string;
  startedAt: number;
  pausedAt: number | null;
  pausedMs: number;
  exercises: TrackExercise[];
  current: number;
  rest: { endsAt: number; total: number } | null;
  minimized: boolean;
}

const uid = () => crypto.randomUUID();

export const newTrackSet = (from?: Partial<TrackSet>): TrackSet => ({
  kind: "working",
  weight: null,
  reps: null,
  holdSec: null,
  rir: null,
  done: false,
  ...from,
  id: uid(),
});

export function trackExercise(exerciseId: string, ex?: Exercise, restSec = 90): TrackExercise {
  const timed = ex?.measure === "time";
  return { id: uid(), exerciseId, note: "", restSec, sets: Array.from({ length: 3 }, () => newTrackSet({ timed })) };
}

let opener: (() => void) | null = null;
export const onOpenStart = (fn: (() => void) | null) => {
  opener = fn;
};
export const openStartSheet = () => opener?.();

export const useActiveWorkout = () =>
  useSyncExternalStore(
    (cb) => {
      const onStorage = (e: StorageEvent) => e.key === KEY && cb();
      window.addEventListener("storage", onStorage);
      const unsub = subscribeLocal(cb);
      return () => {
        window.removeEventListener("storage", onStorage);
        unsub();
      };
    },
    () => readStored<ActiveWorkout>(KEY),
    () => null,
  );

const localListeners = new Set<() => void>();
const subscribeLocal = (cb: () => void) => {
  localListeners.add(cb);
  return () => localListeners.delete(cb);
};

function save(w: ActiveWorkout | null) {
  writeStored(KEY, w);
  localListeners.forEach((l) => l());
}

export function updateWorkout(fn: (w: ActiveWorkout) => ActiveWorkout) {
  const w = readStored<ActiveWorkout>(KEY);
  if (w) save(fn(w));
}

export const readWorkout = () => readStored<ActiveWorkout>(KEY);
export const clearWorkout = () => save(null);

function begin(userId: string, name: string, exercises: TrackExercise[], programId: string | null = null, dayIndex: number | null = null) {
  const w: ActiveWorkout = {
    id: uid(),
    userId,
    name,
    programId,
    dayIndex,
    date: toISODate(new Date()),
    startedAt: Date.now(),
    pausedAt: null,
    pausedMs: 0,
    exercises,
    current: 0,
    rest: null,
    minimized: false,
  };
  save(w);
  return w;
}

export const startEmpty = (userId: string) => begin(userId, "Workout", []);

export function startFromProgram(userId: string, program: Program, dayIndex: number, exercises: Map<string, Exercise>) {
  const day = program.days[dayIndex];
  const list: TrackExercise[] = day.blocks
    .filter((b) => {
      const kind = EDITOR_KIND[b.type];
      return kind && kind !== "cardio" && kind !== "session";
    })
    .flatMap((b) =>
      (b.entries ?? []).flatMap((e) =>
        e.exercises.map((x) => {
          const supersetId = e.exercises.length > 1 ? e.id : undefined;
          const timed = exercises.get(x.exerciseId)?.measure === "time" || x.sets.some((s) => s.holdSec != null && s.reps == null);
          return {
            id: uid(),
            exerciseId: x.exerciseId,
            note: x.notes ?? "",
            restSec: e.restSec ?? 90,
            supersetId,
            sets: x.sets.map((s) => newTrackSet({ kind: s.kind, weight: s.weight, reps: s.reps, holdSec: s.holdSec ?? null, rir: null, timed })),
          };
        }),
      ),
    );
  return begin(userId, day.title || `${program.name} · ${dayLabel(program, dayIndex)}`, list, program.id, dayIndex);
}

export const elapsedMs = (w: ActiveWorkout, now: number) => (w.pausedAt ?? now) - w.startedAt - w.pausedMs;

export function useNow(interval = 1000, active = true) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const tick = () => setNow(Date.now());
    const t = setInterval(tick, interval);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [interval, active]);
  return now;
}

export const fmtClock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
};

export function lastPerformance(logs: WorkoutLog[], exerciseId: string, excludeId?: string) {
  const sorted = [...logs].filter((l) => l.id !== excludeId && l.completedAt).sort((a, b) => (b.startedAt ?? b.date).localeCompare(a.startedAt ?? a.date));
  for (const l of sorted) {
    const x = l.exercises.find((e) => e.exerciseId === exerciseId && e.sets.some((s) => s.done));
    if (x) return { date: l.date, sets: x.sets.filter((s) => s.done) };
  }
  return null;
}

export function toLog(w: ActiveWorkout): WorkoutLog {
  const now = Date.now();
  return {
    id: w.id,
    programId: w.programId ?? "",
    dayIndex: w.dayIndex ?? -1,
    date: w.date,
    name: w.name.slice(0, 120),
    startedAt: new Date(w.startedAt).toISOString(),
    durationSec: Math.min(86400, Math.round(elapsedMs(w, now) / 1000)),
    exercises: w.exercises
      .filter((x) => x.sets.some((s) => s.done))
      .map((x) => ({
        exerciseId: x.exerciseId,
        note: x.note.slice(0, 1000) || undefined,
        supersetId: x.supersetId,
        sets: x.sets.map(
          (s): LoggedSet => ({ weight: s.weight, reps: s.timed ? null : s.reps, holdSec: s.timed ? s.holdSec : null, done: s.done, rir: s.rir, kind: s.kind }),
        ),
      })),
    notes: "",
    completedAt: new Date(now).toISOString(),
  };
}

export function workoutStats(log: Pick<WorkoutLog, "exercises">) {
  let sets = 0;
  let volume = 0;
  for (const x of log.exercises)
    for (const s of x.sets)
      if (s.done && s.kind !== "warmup") {
        sets++;
        volume += (s.weight ?? 0) * (s.reps ?? 0);
      }
  return { sets, volume: Math.round(volume), exercises: log.exercises.length };
}

export function personalBests(log: WorkoutLog, history: WorkoutLog[]) {
  return log.exercises.filter((x) => {
    const metric = metricFor(x.sets);
    const now = bestValue(x.sets, metric);
    if (now == null) return false;
    const before = history
      .filter((l) => l.id !== log.id)
      .flatMap((l) => l.exercises.filter((e) => e.exerciseId === x.exerciseId))
      .map((e) => bestValue(e.sets, metric))
      .filter((v): v is number => v != null);
    return before.length > 0 && now > Math.max(...before);
  });
}

async function upload(log: WorkoutLog) {
  const res = await fetch(`/api/logs/${log.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(log) });
  if (!res.ok) throw new Error(String(res.status));
}

const readPending = () => {
  try {
    return JSON.parse(localStorage.getItem(PENDING) ?? "[]") as WorkoutLog[];
  } catch {
    return [];
  }
};
const writePending = (list: WorkoutLog[]) => {
  try {
    if (list.length) localStorage.setItem(PENDING, JSON.stringify(list));
    else localStorage.removeItem(PENDING);
  } catch {}
};

export async function finishWorkout(w: ActiveWorkout) {
  const log = toLog(w);
  writePending([...readPending().filter((l) => l.id !== log.id), log]);
  const list = readStored<WorkoutLog[]>(KEYS.logs) ?? [];
  writeStored(KEYS.logs, [log, ...list.filter((l) => l.id !== log.id)]);
  clearWorkout();
  try {
    await upload(log);
    writePending(readPending().filter((l) => l.id !== log.id));
  } catch {}
  return log;
}

export async function flushPending() {
  const pending = readPending();
  for (const log of pending) {
    try {
      await upload(log);
      writePending(readPending().filter((l) => l.id !== log.id));
    } catch {
      return;
    }
  }
}

export function warmupSets(first: TrackSet): TrackSet[] {
  const w = first.weight;
  if (!w) return [newTrackSet({ kind: "warmup", reps: 10, timed: first.timed })];
  const round = (v: number) => Math.round(v / 2.5) * 2.5;
  return [newTrackSet({ kind: "warmup", weight: round(w * 0.5), reps: 8 }), newTrackSet({ kind: "warmup", weight: round(w * 0.75), reps: 4 })];
}

export function startFromLog(userId: string, log: WorkoutLog) {
  const list: TrackExercise[] = log.exercises.map((x) => ({
    id: uid(),
    exerciseId: x.exerciseId,
    note: x.note ?? "",
    restSec: 90,
    supersetId: x.supersetId,
    sets: x.sets.map((s) => newTrackSet({ kind: s.kind ?? "working", weight: s.weight, reps: s.reps, holdSec: s.holdSec, timed: s.holdSec != null && s.reps == null })),
  }));
  return begin(userId, log.name || "Workout", list, log.programId || null, log.dayIndex >= 0 ? log.dayIndex : null);
}

export async function askRestNotifications() {
  if (typeof Notification === "undefined" || Notification.permission !== "default") return;
  await Notification.requestPermission().catch(() => null);
}
