import type { Exercise } from "../explorer";
import { hashId, type Measurement } from "../measurements";
import type { WorkoutLog } from "../types";
import { guessDiscipline, guessMuscles, normalize } from "./match";
import type { AppId, ImportWorkout, ParsedFile } from "./parse";

export const APP_LABEL: Record<AppId, string> = { strong: "Strong", hevy: "Hevy", lyfta: "Lyfta", macrofactor: "MacroFactor" };

export interface NameRef {
  key: string;
  name: string;
  app: AppId;
  sets: number;
  timed: boolean;
}

export const nameKey = (app: AppId, name: string) => `${app}|${normalize(name)}`;

export function collectNames(files: ParsedFile[]) {
  const map = new Map<string, NameRef>();
  for (const f of files)
    for (const w of f.workouts)
      for (const x of w.exercises) {
        const key = nameKey(w.app, x.name);
        const ref = map.get(key) ?? { key, name: x.name, app: w.app, sets: 0, timed: true };
        ref.sets += x.sets.length;
        ref.timed = ref.timed && x.sets.every((s) => s.reps == null && s.seconds != null);
        map.set(key, ref);
      }
  return [...map.values()].sort((a, b) => b.sets - a.sets);
}

const localDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const round = (n: number | null, d = 2) => (n == null ? null : Math.round(n * 10 ** d) / 10 ** d);

const EQUIPMENT: [RegExp, string][] = [
  [/barbell/, "barbell"],
  [/dumbbell/, "dumbbell"],
  [/cable/, "cable"],
  [/smith|machine|plate/, "machine"],
  [/kettlebell/, "kettlebell"],
  [/band/, "bands"],
];

export function customFor(ref: NameRef): Exercise {
  const n = normalize(ref.name);
  const muscles = guessMuscles(ref.name);
  return {
    id: `cx-imp${hashId(ref.key)}`,
    name: ref.name.slice(0, 120),
    category: "strength",
    level: "intermediate",
    equipment: EQUIPMENT.find(([re]) => re.test(n))?.[1] ?? "body only",
    mechanic: null,
    force: null,
    primary: muscles.primary,
    secondary: muscles.secondary,
    instructions: [],
    images: [],
    discipline: guessDiscipline(ref.name),
    measure: ref.timed ? "time" : "reps",
    source: "custom",
    importedFrom: ref.app,
    createdAt: new Date().toISOString(),
  };
}

function toLog(w: ImportWorkout, idFor: (name: string) => string): WorkoutLog {
  const merged = new Map<string, WorkoutLog["exercises"][number]>();
  for (const x of w.exercises) {
    const exerciseId = idFor(x.name);
    const sets = x.sets.map((s) => ({
      weight: round(s.weight),
      reps: s.reps == null ? null : Math.round(s.reps),
      holdSec: s.seconds == null ? null : Math.round(s.seconds),
      distanceKm: round(s.distanceKm, 3),
      done: true,
      rir: s.rir == null ? null : Math.max(0, Math.min(10, Math.round(s.rir))),
      kind: s.kind === "warmup" ? ("warmup" as const) : ("working" as const),
    }));
    const prev = merged.get(exerciseId);
    if (prev) prev.sets.push(...sets);
    else merged.set(exerciseId, { exerciseId, note: x.note.slice(0, 1000) || undefined, sets });
  }
  return {
    id: `imp-${w.key}`,
    programId: "",
    dayIndex: -1,
    date: localDate(w.start),
    name: w.name.slice(0, 120),
    startedAt: w.start,
    durationSec: w.durationSec != null ? Math.min(86400, Math.round(w.durationSec)) : undefined,
    source: w.app,
    exercises: [...merged.values()].slice(0, 60).map((x) => ({ ...x, sets: x.sets.slice(0, 40) })),
    notes: w.notes.slice(0, 4000),
    completedAt: w.start,
  };
}

export function buildImport(files: ParsedFile[], choice: Map<string, string | null>) {
  const refs = new Map(collectNames(files).map((r) => [r.key, r]));
  const customs = new Map<string, Exercise>();
  const idFor = (app: AppId) => (name: string) => {
    const key = nameKey(app, name);
    const chosen = choice.get(key);
    if (chosen) return chosen;
    const ex = customFor(refs.get(key) ?? { key, name, app, sets: 0, timed: false });
    customs.set(ex.id, ex);
    return ex.id;
  };

  const logs = new Map<string, WorkoutLog>();
  for (const f of files) for (const w of f.workouts) logs.set(w.key, toLog(w, idFor(w.app)));

  const latest = new Map<string, Measurement>();
  for (const f of files)
    for (const m of f.measurements) {
      const day = localDate(m.date);
      const id = `m-${hashId(`${m.metric}|${day}`)}`;
      const prev = latest.get(id);
      if (!prev || prev.date < m.date) latest.set(id, { id, metric: m.metric, date: m.date, value: m.value, source: f.app });
    }

  return {
    logs: [...logs.values()].filter((l) => l.exercises.length).sort((a, b) => (a.startedAt ?? "").localeCompare(b.startedAt ?? "")),
    measurements: [...latest.values()],
    customExercises: [...customs.values()],
  };
}
